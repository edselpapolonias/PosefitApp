from datetime import date, timedelta
from django.db import transaction
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import CustomUser, UserWorkoutPlan
from .dashboard_service import dashboard_timezone


def first_monday(day):
    return day + timedelta(days=(-day.weekday()) % 7)


def plan_data(plan):
    # Dates and progress reference the existing definition; no exercise prescriptions are copied.
    schedule = [
        {'id': f'week-{week}-{day}', 'week': week, 'day': day.title(),
         'date': (plan.start_date + timedelta(days=(week - 1) * 7 + offset)).isoformat()}
        for week in range(1, 5) for day, offset in [('monday', 0), ('wednesday', 2), ('friday', 4)]
    ]
    valid_ids = {workout['id'] for workout in schedule}
    completed = list(dict.fromkeys(item for item in plan.completed_workout_ids if item in valid_ids))
    current = next((item for item in schedule if item['id'] not in completed), None)
    return {
        'id': plan.plan_id, 'instanceId': plan.pk, 'userId': plan.user_id,
        'name': 'Beginner Full Body', 'status': plan.status,
        'activatedAt': plan.activated_at.isoformat(), 'startDate': plan.start_date.isoformat(),
        'completedAt': plan.completed_at.isoformat() if plan.completed_at else None,
        'durationWeeks': 4, 'totalWorkouts': len(schedule), 'schedule': schedule,
        'completedWorkoutIds': completed, 'completedWorkouts': len(completed),
        'remainingWorkouts': len(schedule) - len(completed), 'percentage': round(len(completed) / len(schedule) * 100),
        'activeWeek': max(1, min(4, (timezone.localdate(timezone=dashboard_timezone()) - plan.start_date).days // 7 + 1)),
        'activeDay': current['day'] if current else None, 'currentWorkoutId': current['id'] if current else None,
    }


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def active_workout_plan(request):
    if request.method == 'GET':
        plan = UserWorkoutPlan.objects.filter(user=request.user, status='active').first()
        return Response({'plan': plan_data(plan) if plan else None})
    if request.data.get('planId') != 'beginner-full-body':
        return Response({'error': 'This plan is not available for activation.'}, status=400)
    with transaction.atomic():
        CustomUser.objects.select_for_update().get(pk=request.user.pk)
        plan = UserWorkoutPlan.objects.filter(user=request.user, status='active').first()
        if plan and plan.plan_id != 'beginner-full-body':
            return Response({'error': 'You already have an active workout plan. End it before starting this plan.'}, status=409)
        if not plan:
            today = timezone.localdate(timezone=dashboard_timezone())
            try:
                selected = date.fromisoformat(request.data.get('startDate', ''))
            except (TypeError, ValueError):
                return Response({'error': 'Please choose a valid Monday start date.'}, status=400)
            if selected.weekday() != 0 or selected < today:
                return Response({'error': 'Please choose today or a future Monday.'}, status=400)
            plan = UserWorkoutPlan.objects.create(user=request.user, plan_id='beginner-full-body', start_date=selected)
        return Response({'plan': plan_data(plan)})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def end_workout_plan(request):
    with transaction.atomic():
        CustomUser.objects.select_for_update().get(pk=request.user.pk)
        plan = UserWorkoutPlan.objects.filter(user=request.user, pk=request.data.get('instanceId'), status='active').first()
        if plan:
            plan.status = 'ended'
            plan.ended_at = timezone.now()
            plan.save(update_fields=['status', 'ended_at'])
    return Response({'ended': True})
