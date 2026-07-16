from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import User, Student, Report


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    fieldsets = DjangoUserAdmin.fieldsets + (
        ('SUZA Medical', {'fields': ('role', 'doctor_name', 'specialty', 'phone')}),
    )
    list_display = ('username', 'email', 'role', 'doctor_name', 'is_active')
    list_filter = ('role', 'is_active', 'is_staff')


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ('student_id', 'student_name', 'program', 'email', 'registered_at')
    search_fields = ('student_id', 'student_name', 'email')


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ('id', 'student', 'doctor', 'visit_date', 'status', 'submitted_at')
    list_filter = ('status', 'visit_date')
    search_fields = ('student__student_id', 'student__student_name', 'diagnosis')
