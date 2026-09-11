from django.db.models import Q

from .models import WorkoutSession


def _non_negative_integer(value):
    try:
        parsed = int(float(value))
    except (TypeError, ValueError):
        return None
    return max(0, parsed)


def _configuration_value(configuration, *keys):
    for key in keys:
        value = _non_negative_integer(configuration.get(key))
        if value is not None and value > 0:
            return value
    return None


def _session_snapshot(session):
    if not session:
        return None

    configuration = session.configuration if isinstance(getattr(session, 'configuration', None), dict) else {}
    metric_type = getattr(session, 'metric_type', WorkoutSession.METRIC_REPS)
    target_sets = _configuration_value(configuration, 'totalSets', 'targetSets', 'sets')
    per_leg = bool(configuration.get('perLeg'))
    completed_sets = _non_negative_integer(getattr(session, 'sets_completed', None)) or 0
    total_reps = _non_negative_integer(getattr(session, 'total_reps', None))
    correct_reps = _non_negative_integer(getattr(session, 'correct_reps', None))
    incorrect_reps = _non_negative_integer(getattr(session, 'incorrect_reps', None))

    if total_reps is None and correct_reps is not None and incorrect_reps is not None:
        total_reps = correct_reps + incorrect_reps

    target_reps_per_set = None
    target_hold_seconds_per_set = None
    target_total_reps = None
    target_total_hold_time = None
    if metric_type == WorkoutSession.METRIC_TIME:
        target_hold_seconds_per_set = _configuration_value(
            configuration,
            'holdSecondsPerSet',
            'holdTime',
            'targetHoldTime',
        )
        if target_hold_seconds_per_set is not None and target_sets is not None:
            target_total_hold_time = target_hold_seconds_per_set * target_sets
    else:
        target_reps_per_set = _configuration_value(
            configuration,
            'repsPerSet',
            'targetReps',
            'reps',
        )
        if target_reps_per_set is not None and target_sets is not None:
            target_total_reps = target_reps_per_set * target_sets * (2 if per_leg else 1)

    return {
        'sessionId': session.session_id,
        'metricType': metric_type,
        'accuracy': session.accuracy,
        'completedAt': session.completed_at.isoformat(),
        'correctReps': correct_reps,
        'incorrectReps': incorrect_reps,
        'totalReps': total_reps,
        'setsCompleted': completed_sets,
        'totalHoldTime': _non_negative_integer(getattr(session, 'total_hold_time', None)),
        'target': {
            'repsPerSet': target_reps_per_set,
            'sets': target_sets,
            'totalReps': target_total_reps,
            'perLeg': per_leg,
            'holdSecondsPerSet': target_hold_seconds_per_set,
            'totalHoldTime': target_total_hold_time,
        },
        'completed': {
            'reps': total_reps,
            'sets': completed_sets,
            'holdTime': _non_negative_integer(getattr(session, 'total_hold_time', None)),
        },
    }


def _configuration_signature(snapshot):
    target = snapshot['target']
    if snapshot['metricType'] == WorkoutSession.METRIC_TIME:
        signature = (target['holdSecondsPerSet'], target['sets'])
    else:
        signature = (target['repsPerSet'], target['sets'], target['perLeg'])
    return signature if all(value is not None for value in signature) else None


def _planned_volume(snapshot):
    target = snapshot['target']
    if snapshot['metricType'] == WorkoutSession.METRIC_TIME:
        return target['totalHoldTime']
    return target['totalReps']


def _volume_comparison(current, previous):
    current_volume = _planned_volume(current)
    previous_volume = _planned_volume(previous)
    if current_volume is None or previous_volume is None:
        return 'unknown'
    if current_volume > previous_volume:
        return 'higher'
    if current_volume < previous_volume:
        return 'lower'
    return 'same'


def _comparison_message(exercise_name, difference, current, previous, same_configuration, volume):
    magnitude = abs(difference)
    point_label = 'point' if magnitude == 1 else 'points'

    if same_configuration:
        if difference > 0:
            return (
                f'Your form accuracy improved by {magnitude} percentage {point_label} compared with '
                f'your previous {exercise_name} session under the same workout configuration.'
            )
        if difference < 0:
            return (
                f'Your form accuracy decreased by {magnitude} percentage {point_label} compared with '
                f'your previous {exercise_name} session under the same workout configuration.'
            )
        return (
            f'Your form accuracy remained the same as your previous {exercise_name} session '
            'under the same workout configuration.'
        )

    current_accuracy = current['accuracy']
    previous_accuracy = previous['accuracy']
    if difference == 0:
        return (
            'Your form accuracy remained the same, although the two sessions used different '
            'workout configurations.'
        )

    direction = 'improved' if difference > 0 else 'decreased'
    if volume == 'higher':
        connector = 'while completing' if difference > 0 else 'but your current session involved'
        return (
            f'Your form accuracy {direction} from {previous_accuracy}% to {current_accuracy}%, '
            f'{connector} a higher workout volume than your previous {exercise_name} session.'
        )
    if volume == 'lower':
        connector = 'although' if difference > 0 else 'while'
        return (
            f'Your form accuracy {direction} from {previous_accuracy}% to {current_accuracy}%, '
            f'{connector} your current session had a lower workout volume than your previous '
            f'{exercise_name} session.'
        )
    if volume == 'same':
        return (
            f'Your form accuracy {direction} by {magnitude} percentage {point_label} with a different '
            'workout configuration but the same planned total volume.'
        )
    return (
        f'Your form accuracy {direction} by {magnitude} percentage {point_label}; workout '
        'configuration details were unavailable for a complete volume comparison.'
    )


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

    previous = _session_snapshot(previous_session)
    difference = current['accuracy'] - previous['accuracy']
    if difference > 0:
        comparison_status = 'improved'
    elif difference < 0:
        comparison_status = 'decreased'
    else:
        comparison_status = 'no_change'

    current_signature = _configuration_signature(current)
    previous_signature = _configuration_signature(previous)
    same_metric_type = current['metricType'] == previous['metricType']
    configurations_available = (
        same_metric_type
        and current_signature is not None
        and previous_signature is not None
    )
    same_configuration = configurations_available and current_signature == previous_signature
    volume = _volume_comparison(current, previous) if same_metric_type else 'unknown'
    if not configurations_available:
        configuration_status = 'configuration_unavailable'
        configuration_label = 'Workout Configuration Unavailable'
    elif same_configuration:
        configuration_status = 'same_configuration'
        configuration_label = 'Same Workout Configuration'
    else:
        configuration_status = 'different_volume'
        configuration_label = 'Different Workout Volume'

    return {
        'hasPrevious': True,
        'status': comparison_status,
        'title': f'Compared to your last {exercise_name} session',
        'current': current,
        'previous': previous,
        'differencePercentagePoints': difference,
        'sameConfiguration': same_configuration,
        'configurationStatus': configuration_status,
        'configurationLabel': configuration_label,
        'volumeComparison': volume,
        'message': _comparison_message(
            exercise_name,
            difference,
            current,
            previous,
            same_configuration,
            volume,
        ),
    }
