from django.db.models import Q

from .models import WorkoutSession


def _session_snapshot(session):
    if not session:
        return None
    return {
        'sessionId': session.session_id,
        'accuracy': session.accuracy,
        'completedAt': session.completed_at.isoformat(),
        'correctReps': session.correct_reps,
        'incorrectReps': session.incorrect_reps,
        'totalHoldTime': session.total_hold_time,
    }


def find_previous_completed_session(current_session):
    """Return the immediately previous completed session for this user/exercise."""
    return (
        WorkoutSession.objects.filter(
            user=current_session.user,
            exercise=current_session.exercise,
            status=WorkoutSession.STATUS_COMPLETED,
        )
        .exclude(pk=current_session.pk)
        .filter(
            Q(completed_at__lt=current_session.completed_at)
            | Q(completed_at=current_session.completed_at, pk__lt=current_session.pk)
        )
        .order_by('-completed_at', '-pk')
        .first()
    )


def build_progress_comparison(current_session, previous_session=None):
    exercise_name = current_session.exercise_name
    current = _session_snapshot(current_session)

    if previous_session is None:
        return {
            'hasPrevious': False,
            'status': 'first_session',
            'title': f'First {exercise_name} Session',
            'current': current,
            'previous': None,
            'differencePercentagePoints': None,
            'message': (
                f'This is your first recorded {exercise_name} session. '
                f'Complete another {exercise_name} session to start tracking your progress.'
            ),
        }

    difference = current_session.accuracy - previous_session.accuracy
    magnitude = abs(difference)
    if difference > 0:
        comparison_status = 'improved'
        message = (
            f'Your form accuracy improved by {magnitude} percentage '
            f'{"point" if magnitude == 1 else "points"} compared with your previous {exercise_name} session.'
        )
    elif difference < 0:
        comparison_status = 'decreased'
        message = (
            f'Your form accuracy decreased by {magnitude} percentage '
            f'{"point" if magnitude == 1 else "points"} compared with your previous {exercise_name} session.'
        )
    else:
        comparison_status = 'no_change'
        message = f'Your form accuracy remained the same as your previous {exercise_name} session.'

    return {
        'hasPrevious': True,
        'status': comparison_status,
        'title': f'Compared to your last {exercise_name} session',
        'current': current,
        'previous': _session_snapshot(previous_session),
        'differencePercentagePoints': difference,
        'message': message,
    }
