from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import authenticate, login, logout
from .models import CustomUser

@api_view(['POST'])
def register(request):
    data = request.data
    username = data.get('username', '').strip().lower()
    first_name = data.get('first_name')
    last_name = data.get('last_name')
    password = data.get('password')
    confirm_password = data.get('confirm_password')
    age = data.get('age')

    if not username:
        return Response({'error': 'Username is required'}, status=400)

    if password != confirm_password:
        return Response({'error': 'Passwords do not match'}, status=400)

    if CustomUser.objects.filter(username=username).exists():
        return Response({'error': 'Username already exists'}, status=400)

    user = CustomUser.objects.create_user(
        username=username,
        first_name=first_name,
        last_name=last_name,
        password=password,
        age=age
    )
    return Response({'message': 'Account created successfully!'}, status=201)


@api_view(['POST'])
def login_view(request):
    data = request.data
    username = data.get('username', '').strip().lower()
    password = data.get('password')

    user = authenticate(request, username=username, password=password)

    if user:
        login(request, user)
        return Response({
            'message': 'Login successful',
            'user': {
                'username': user.username,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'age': user.age,
            }
        })
    return Response({'error': 'Invalid credentials'}, status=400)


@api_view(['POST'])
def logout_view(request):
    logout(request)
    return Response({'message': 'Logged out'})