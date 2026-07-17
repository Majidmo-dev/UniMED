from datetime import timedelta

from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import User, Student, Report
from .serializers import (
    DoctorSerializer,
    LoginSerializer,
    ReportSerializer,
    StudentLoginSerializer,
    StudentSerializer,
    UserSerializer,
)


class IsAdmin(IsAuthenticated):
    def has_permission(self, request, view):
        return super().has_permission(request, view) and request.user.role == User.ROLE_ADMIN


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        token, _ = Token.objects.get_or_create(user=user)
        return Response({
            'token': token.key,
            'user': UserSerializer(user).data,
        })


class LogoutView(APIView):
    def post(self, request):
        Token.objects.filter(user=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    return Response(UserSerializer(request.user).data)


class StudentViewSet(viewsets.ModelViewSet):
    queryset = Student.objects.all().order_by('-registered_at')
    serializer_class = StudentSerializer
    lookup_field = 'student_id'
    lookup_url_kwarg = 'student_id'

    def get_permissions(self):
        if self.action in ('create', 'retrieve', 'list', 'login'):
            return [AllowAny()]
        return [IsAdmin()]

    def get_object(self):
        sid = self.kwargs[self.lookup_url_kwarg].upper()
        obj = self.get_queryset().filter(student_id=sid).first()
        if obj is None:
            from django.http import Http404
            raise Http404('Student not found.')
        self.check_object_permissions(self.request, obj)
        return obj

    @action(detail=False, methods=['post'], url_path='login')
    def login(self, request):
        serializer = StudentLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        student = serializer.validated_data['student']
        return Response(StudentSerializer(student).data)


class DoctorViewSet(viewsets.ModelViewSet):
    queryset = User.objects.filter(role=User.ROLE_DOCTOR).order_by('-date_joined')
    serializer_class = DoctorSerializer
    lookup_field = 'username'
    lookup_url_kwarg = 'username'

    def get_permissions(self):
        if self.action == 'list':
            return [IsAuthenticated()]
        return [IsAdmin()]


class ReportViewSet(viewsets.ModelViewSet):
    queryset = Report.objects.select_related('student', 'doctor').all()
    serializer_class = ReportSerializer

    def get_permissions(self):
        if self.action in ('weekly_count', 'list'):
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        student_id = self.request.query_params.get('studentId')
        if student_id:
            qs = qs.filter(student__student_id=student_id.upper())
        return qs

    def destroy(self, request, *args, **kwargs):
        if request.user.role != User.ROLE_ADMIN:
            return Response({'detail': 'Only admin can delete reports.'},
                            status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=['get'], url_path='weekly-count')
    def weekly_count(self, request):
        cutoff = timezone.now() - timedelta(days=7)
        return Response({'count': Report.objects.filter(submitted_at__gte=cutoff).count()})
