#!/usr/bin/env python
"""
Run this project's services (or any manage.py command against them).

Usage:
    python runserver.py                          # interactive: pick service(s) + command
    python runserver.py store                    # runserver for one service
    python runserver.py store user               # runserver for several services in parallel
    python runserver.py all                      # runserver for every registered service
    python runserver.py store migrate            # any manage.py command for a service
    python runserver.py all makemigrations       # command runs once per service, in order
    python runserver.py user shell               # interactive commands work too
    python runserver.py store runserver --noreload
    python runserver.py --list                   # show registered services

Arguments are: <service...> [command] [command args...]
The first argument that is not a registered service name is the manage.py command;
everything after it is passed through unchanged. Default command: runserver.

Registering a new service:
    Add one entry to SERVICES below:
        "<name>": Service(settings="app.settings_<name>_service", port=<port>),
"""
import os
import signal
import subprocess
import sys
import threading
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Service:
    settings: str        # Django settings module passed via --settings
    port: int            # port used by runserver
    host: str = "127.0.0.1"


# ---------------------------------------------------------------------------
# Service registry. Add a line here to register a new service.
# ---------------------------------------------------------------------------
SERVICES: dict[str, Service] = {
    "store": Service(settings="app.settings_store_service", port=8000), # Equivalent to  python manage.py runserver 8000 --settings=app.settings_store_service
    "auth": Service(settings="app.settings_auth_service", port=8001),
}
# ---------------------------------------------------------------------------

DEFAULT_COMMAND = "runserver"
BASE_DIR = Path(__file__).resolve().parent
MANAGE_PY = BASE_DIR / "manage.py"

COLORS = ["\033[36m", "\033[35m", "\033[33m", "\033[32m", "\033[34m", "\033[31m"]
RESET = "\033[0m"


# ----------------------------------------------------------------- selection

def print_services() -> None:
    print("Registered services:")
    for i, (name, svc) in enumerate(SERVICES.items(), start=1):
        print(f"  {i}. {name:<12} {svc.host}:{svc.port}  ({svc.settings})")


def resolve_selection(tokens: list[str]) -> list[str]:
    names = list(SERVICES)
    selected: list[str] = []
    for token in tokens:
        token = token.lower()
        if token in ("a", "all"):
            return names
        if token.isdigit() and 1 <= int(token) <= len(names):
            name = names[int(token) - 1]
        elif token in SERVICES:
            name = token
        else:
            raise ValueError(f"Unknown service '{token}'. Choose from: {', '.join(names)}")
        if name not in selected:
            selected.append(name)
    return selected


def prompt_interactive() -> tuple[list[str], list[str]]:
    print_services()
    print("  a. all")
    while True:
        raw = input("\nSelect service(s) (e.g. 1  |  1,2  |  store user  |  a): ").strip()
        if not raw:
            continue
        try:
            names = resolve_selection(raw.replace(",", " ").split())
            break
        except ValueError as exc:
            print(exc)
    raw = input(f"Command [{DEFAULT_COMMAND}]: ").strip()
    command = raw.split() if raw else [DEFAULT_COMMAND]
    return names, command


def parse_args(argv: list[str]) -> tuple[list[str], list[str]]:
    """Split argv into (service names, manage.py command + args)."""
    service_tokens: list[str] = []
    i = 0
    while i < len(argv):
        token = argv[i].lower()
        if token in SERVICES or token in ("a", "all"):
            service_tokens.append(token)
            i += 1
        else:
            break
    if not service_tokens:
        raise ValueError(
            f"No service given. Choose from: {', '.join(SERVICES)} or 'all' "
            "(or run without arguments for the interactive menu)."
        )
    command = argv[i:]
    if not command or command[0].startswith("-"):
        # e.g. `store --noreload` -> runserver --noreload
        command = [DEFAULT_COMMAND, *command]
    return resolve_selection(service_tokens), command


# ----------------------------------------------------------------- execution

def build_command(svc: Service, command: list[str]) -> list[str]:
    cmd = [sys.executable, str(MANAGE_PY), *command]
    if command[0] == "runserver":
        has_addrport = any(not a.startswith("-") for a in command[1:])
        if not has_addrport:
            cmd.insert(3, f"{svc.host}:{svc.port}")
    cmd.append(f"--settings={svc.settings}")
    return cmd


def run_foreground(name: str, command: list[str]) -> int:
    """Run one command attached to the console (keeps colors and interactivity)."""
    svc = SERVICES[name]
    print(f"==> [{name}] manage.py {' '.join(command)}  ({svc.settings})")
    try:
        return subprocess.call(build_command(svc, command), cwd=BASE_DIR)
    except KeyboardInterrupt:
        return 130


def run_sequential(names: list[str], command: list[str]) -> int:
    """Run a non-server command once per service, stopping on the first failure."""
    for name in names:
        code = run_foreground(name, command)
        if code != 0:
            print(f"==> [{name}] failed with exit code {code}")
            return code
        print()
    return 0


def stream_output(name: str, color: str, proc: subprocess.Popen, width: int) -> None:
    prefix = f"{color}[{name:<{width}}]{RESET} "
    assert proc.stdout is not None
    for line in proc.stdout:
        sys.stdout.write(prefix + line)
        sys.stdout.flush()


def kill_tree(proc: subprocess.Popen) -> None:
    """Stop a runserver process along with its autoreloader child."""
    if proc.poll() is not None:
        return
    if os.name == "nt":
        subprocess.run(["taskkill", "/F", "/T", "/PID", str(proc.pid)],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    else:
        try:
            os.killpg(proc.pid, signal.SIGTERM)
        except ProcessLookupError:
            pass


def run_parallel(names: list[str], command: list[str]) -> int:
    """Run several servers at once with prefixed, colored output."""
    if os.name == "nt":
        os.system("")  # enable ANSI colors in the Windows console

    seen: dict[tuple[str, int], str] = {}
    for name in names:
        svc = SERVICES[name]
        if (svc.host, svc.port) in seen:
            print(f"Services '{seen[(svc.host, svc.port)]}' and '{name}' share {svc.host}:{svc.port}.")
            return 2
        seen[(svc.host, svc.port)] = name

    env = {**os.environ, "PYTHONUNBUFFERED": "1"}
    width = max(len(n) for n in names)
    procs: list[subprocess.Popen] = []
    threads: list[threading.Thread] = []

    for i, name in enumerate(names):
        svc = SERVICES[name]
        color = COLORS[i % len(COLORS)]
        print(f"{color}==> [{name}] http://{svc.host}:{svc.port}  ({svc.settings}){RESET}")
        proc = subprocess.Popen(
            build_command(svc, command),
            cwd=BASE_DIR, env=env, text=True, bufsize=1,
            stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
            start_new_session=(os.name != "nt"),
        )
        procs.append(proc)
        t = threading.Thread(target=stream_output, args=(name, color, proc, width), daemon=True)
        t.start()
        threads.append(t)
    print()

    try:
        while any(p.poll() is None for p in procs):
            for t in threads:
                t.join(timeout=0.5)
    except KeyboardInterrupt:
        print("\nStopping services...")
    finally:
        for p in procs:
            kill_tree(p)
        for p in procs:
            try:
                p.wait(timeout=10)
            except subprocess.TimeoutExpired:
                pass
    return 0


def main(argv: list[str]) -> int:
    if argv and argv[0] in ("-h", "--help"):
        print(__doc__)
        return 0
    if argv and argv[0] in ("-l", "--list"):
        print_services()
        return 0

    try:
        names, command = parse_args(argv) if argv else prompt_interactive()
    except ValueError as exc:
        print(exc)
        return 2
    except (KeyboardInterrupt, EOFError):
        print()
        return 0

    if command[0] == "runserver" and len(names) > 1:
        return run_parallel(names, command)
    if len(names) == 1:
        return run_foreground(names[0], command)
    return run_sequential(names, command)


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
