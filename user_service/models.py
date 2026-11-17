from django.db import models

# Create your models here.
class UserModel(models.Model):
    email = models.EmailField()
    password = models.CharField()