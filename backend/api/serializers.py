from django.contrib.auth import authenticate
from rest_framework import serializers

from .models import User, Student, Report


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)
    role = serializers.ChoiceField(choices=[User.ROLE_ADMIN, User.ROLE_DOCTOR])

    def validate(self, attrs):
        user = authenticate(username=attrs['username'], password=attrs['password'])
        if user is None or not user.is_active:
            raise serializers.ValidationError('Invalid credentials.')
        if user.role != attrs['role']:
            raise serializers.ValidationError('This account is not registered for that role.')
        attrs['user'] = user
        return attrs


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'role', 'doctor_name', 'specialty', 'phone')


class DoctorSerializer(serializers.ModelSerializer):
    doctorId = serializers.CharField(source='username')
    doctorName = serializers.CharField(source='doctor_name', required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    registeredAt = serializers.DateTimeField(source='date_joined', read_only=True)

    class Meta:
        model = User
        fields = ('doctorId', 'doctorName', 'specialty', 'email', 'phone', 'password', 'registeredAt')

    def create(self, validated_data):
        password = validated_data.pop('password', None) or 'Suza@2026'
        username = validated_data.pop('username')
        user = User(
            username=username,
            email=validated_data.get('email', '') or username,
            role=User.ROLE_DOCTOR,
            doctor_name=validated_data.get('doctor_name', ''),
            specialty=validated_data.get('specialty', ''),
            phone=validated_data.get('phone', ''),
        )
        user.set_password(password)
        user.save()
        return user


class StudentSerializer(serializers.ModelSerializer):
    studentId = serializers.CharField(source='student_id')
    studentName = serializers.CharField(source='student_name')
    password = serializers.CharField(write_only=True, required=False, allow_blank=True, min_length=6)
    registeredAt = serializers.DateTimeField(source='registered_at', read_only=True)

    class Meta:
        model = Student
        fields = ('studentId', 'studentName', 'program', 'email', 'phone', 'password', 'registeredAt')

    def create(self, validated_data):
        password = validated_data.pop('password', '')
        if not password:
            raise serializers.ValidationError({'password': 'Password is required.'})
        student = Student(**validated_data)
        student.set_password(password)
        student.save()
        return student


class StudentLoginSerializer(serializers.Serializer):
    studentId = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        sid = attrs['studentId'].upper()
        try:
            student = Student.objects.get(student_id=sid)
        except Student.DoesNotExist:
            raise serializers.ValidationError('Invalid Student ID or password.')
        if not student.check_password(attrs['password']):
            raise serializers.ValidationError('Invalid Student ID or password.')
        attrs['student'] = student
        return attrs


class ReportSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()
    studentId = serializers.CharField(write_only=True)
    studentName = serializers.CharField(source='student.student_name', read_only=True)
    student_id_display = serializers.CharField(source='student.student_id', read_only=True)
    visitDate = serializers.DateField(source='visit_date')
    followUp = serializers.DateField(source='follow_up', required=False, allow_null=True)
    doctorId = serializers.CharField(source='doctor.username', read_only=True)
    submittedAt = serializers.DateTimeField(source='submitted_at', read_only=True)

    class Meta:
        model = Report
        fields = (
            'id', 'studentId', 'studentName', 'student_id_display',
            'visitDate', 'hospital', 'diagnosis', 'treatment',
            'prescription', 'followUp', 'status', 'notes',
            'doctorId', 'submittedAt',
        )

    def get_id(self, obj):
        return f'RPT-{obj.pk}'

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['studentId'] = data.pop('student_id_display', '')
        return data

    def create(self, validated_data):
        student_id = validated_data.pop('studentId').upper()
        try:
            student = Student.objects.get(student_id=student_id)
        except Student.DoesNotExist:
            raise serializers.ValidationError({'studentId': 'Student is not registered.'})
        doctor = self.context['request'].user
        return Report.objects.create(student=student, doctor=doctor, **validated_data)
