from django.conf import settings
from django_redis import get_redis_connection

class Cart:
    def __init__(self, user_id, store_id):
        
        self.key = f"cart:{user_id}:{store_id}"
        self.redis = get_redis_connection("default")
    
    def items(self) -> dict[str, int]:
        return {k.decode(): int(v) for k, v in self.redis.hgetall(self.key).items()}

    def add(self, product_id, qty):
        with self.redis.pipeline() as p:
            p.hincrby(self.key, str(product_id), qty)
            p.expire(self.key, settings.CART_TTL_SECONDS)
            return p.execute()[0]
    
    def set(self, product_id, qty):
        with self.redis.pipeline() as p:
            p.hset(self.key, str(product_id), qty)
            p.expire(self.key, settings.CART_TTL_SECONDS)
            return p.execute()[0]
    
    def remove(self, product_id):
        self.redis.hdel(self.key, str(product_id))
    
    def clear(self):
        self.redis.delete(self.key)

    @staticmethod
    def store_ids_for_user(user_id) -> list[str]:
        prefix = f"cart:{user_id}:"
        redis = get_redis_connection("default")
        return [key.decode()[len(prefix):] for key in redis.scan_iter(match=f"{prefix}*", count=100)]
            