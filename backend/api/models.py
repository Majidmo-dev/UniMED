from django.contrib.auth.hashers import check_password, make_password
from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    ROLE_ADMIN = 'admin'
    ROLE_DOCTOR = 'doctor'
    ROLE_CHOICES = [
        (ROLE_ADMIN, 'Admin'),
        (ROLE_DOCTOR, 'Doctor'),
    ]

    role = models.CharField(max_length=16, choices=ROLE_CHOICES, default=ROLE_DOCTOR)
    doctor_name = models.CharField(max_length=120, blank=True)
    specialty = models.CharField(max_length=120, blank=True)
    phone = models.CharField(max_length=32, blank=True)

    def __str__(self):
        return f'{self.username} ({self.role})'


class Student(models.Model):
    student_id = models.CharField(max_length=64, unique=True)
    student_name = models.CharField(max_length=120)
    program = models.CharField(max_length=120, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=32, blank=True)
    password_hash = models.CharField(max_length=128, blank=True)
    registered_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        self.student_id = self.student_id.upper()
        super().save(*args, **kwargs)

    def set_password(self, raw_password):
        self.password_hash = make_password(raw_password)

    def check_password(self, raw_password):
        return bool(self.password_hash) and check_password(raw_password, self.password_hash)

    def __str__(self):
        return f'{self.student_id} - {self.student_name}'


class Report(models.Model):
    STATUS_CHOICES = [
        ('Reviewed', 'Reviewed'),
        ('Follow-up required', 'Follow-up required'),
        ('Referred', 'Referred'),
        ('Closed', 'Closed'),
    ]

    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='reports')
    doctor = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reports'
    )
    visit_date = models.DateField()
    hospital = models.CharField(max_length=200, blank=True)
    diagnosis = models.TextField()
    treatment = models.TextField(blank=True)
    prescription = models.TextField(blank=True)
    follow_up = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=32, choices=STATUS_CHOICES, default='Reviewed')
    notes = models.TextField(blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-submitted_at']

    def __str__(self):
        return f'Report {self.pk} for {self.student.student_id}'
