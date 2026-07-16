from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r'students', views.StudentViewSet, basename='student')
router.register(r'doctors', views.DoctorViewSet, basename='doctor')
router.register(r'reports', views.ReportViewSet, basename='report')

urlpatterns = [
    path('auth/login/', views.LoginView.as_view(), name='login'),
    path('auth/logout/', views.LogoutView.as_view(), name='logout'),
    path('auth/me/', views.me, name='me'),
    path('', include(router.urls)),
]
