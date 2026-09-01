PoseFit System Implementation Plan

Table of Contents

Project Overview

System Flow

Authentication

Dashboard

Exercise Selection

Exercise Setup

Exercise Session

Biomechanical Exercise Detection

Accuracy and Session Results

Gemini Generated Feedback

Workout Plan

Workout History and Progress

Responsive Design

System Architecture

Core System Requirements

Development Phases

Scientific Basis

1. Project Overview

PoseFit is a computer vision based web application designed to evaluate exercise form in real time using pose estimation and biomechanical joint angle analysis.

PoseFit supports five exercises:

Squat

Push Up

Plank

Forward Lunge

Sit Up

The system uses the device camera to:

Detect body landmarks

Calculate joint angles

Evaluate exercise form

Count repetitions

Track exercise sets

Monitor exercise duration

Provide real time corrective feedback

Generate exercise accuracy reports

Compare workout performance

Track user progress

Generate post workout feedback

Supported Devices

PoseFit must be responsive and adjustable based on the user's device.

The system should support:

Desktop computers

Laptops

Tablets

Mobile devices

The interface should automatically adapt according to the available screen size without removing important system functions.

2. System Flow

The general PoseFit workflow is:

Login / Signup → Dashboard → Exercise Selection or Workout Plan → Exercise Setup → Camera Session → Session Results → Progress Update → History

Normal Exercise Session Flow

The user logs in.

The user selects an exercise.

The user configures repetitions, sets, and rest time.

The user clicks Start Now.

PoseFit activates the device camera.

MediaPipe detects the user's body landmarks.

PoseFit calculates the required joint angles.

The system determines the current exercise movement state.

PoseFit evaluates whether the exercise is being performed correctly.

Corrective feedback is shown when an incorrect movement is detected.

Valid repetitions are automatically counted.

Sets are automatically monitored.

A rest timer starts after each completed set.

The user completes or manually ends the workout.

PoseFit calculates the exercise results and accuracy.

Processed session information is sent to the Gemini API.

Gemini generates personalized feedback based on the PoseFit results.

The session results are displayed.

The completed session is saved to the database.

Dashboard statistics, history, and progress reports are updated.

3. Authentication

3.1 Login Page

The Login Page allows registered users to access their PoseFit account.

Required Fields

Username

Password

Functions

Login

Show or Hide Password

Form Validation

Invalid Credential Notification

Redirect to Signup Page

After successful authentication, the user is redirected to the Dashboard.

3.2 Signup Page

The Signup Page allows new users to create a PoseFit account.

After successful registration, the user may be automatically logged in or redirected to the Login Page.

4. Dashboard

The Dashboard serves as the main overview of the user's workout activity and progress.

It should allow users to quickly understand their recent exercise performance.

4.1 User Greeting

Display a personalized greeting.

Example:

Good morning, Alex! Ready for today's workout?

4.2 Login Streak

Display the number of consecutive days the user has logged in to PoseFit.

Example:

🔥 7 Day Login Streak

The streak is intended to encourage consistent system use.

4.3 Seven Day Exercise Bar Graph

The Dashboard should contain a bar graph showing how many minutes the user exercised during the previous seven days.

Example:

Day

Exercise Duration

Monday

30 minutes

Tuesday

20 minutes

Wednesday

0 minutes

Thursday

45 minutes

Friday

25 minutes

Saturday

60 minutes

Sunday

35 minutes

The graph should automatically update whenever a workout session is completed.

4.4 Progress Report

The Dashboard should provide a summary of the user's exercise progress.

Possible statistics include:

Total workouts completed

Total exercise minutes

Total repetitions

Total sets

Average exercise accuracy

Highest recorded accuracy

Current workout streak

Workouts completed this week

Example:

Weekly Progress

4 Workouts Completed

125 Total Minutes

320 Total Repetitions

89% Average Form Accuracy

4.5 Recent Workout

Display the user's most recently completed exercise.

Example:

Push Up

3 Sets

30 Repetitions

88% Accuracy

12 Minutes

The user should be able to open the complete session result.

4.6 Today's Workout

If the user has a scheduled workout plan, the Dashboard should display it.

Example:

Today's Workout

Squat

Push Up

Plank

A Start Workout button should allow the user to begin the scheduled workout.

4.7 Quick Actions

Suggested Dashboard actions:

Start Exercise

View Workout Plan

View History

View Progress

5. Exercise Selection

The Exercise Selection Page displays the five exercises supported by PoseFit.

Available Exercises

Squat

Push Up

Plank

Forward Lunge

Sit Up

Each exercise should be represented by an exercise card.

Exercise Card Content

Each card may contain:

Exercise Name

Exercise Image or Illustration

Short Description

Target Body Area

Start Exercise Button

Example:

Squat

Develops the lower body while PoseFit monitors knee and hip movement.

Start Exercise

Selecting an exercise redirects the user to its Exercise Setup Page.

6. Exercise Setup

Before activating the camera, the user configures the exercise session.

6.1 Repetitions

The user selects the target number of repetitions for each set.

Example:

10 Repetitions

6.2 Sets

The user selects the target number of sets.

Example:

3 Sets

6.3 Rest Time

The user selects the rest duration after each completed set.

Suggested options:

15 seconds

30 seconds

45 seconds

60 seconds

90 seconds

A custom rest duration may also be provided.

6.4 Plank Configuration

Because the plank is a time based exercise, its setup should use hold duration instead of repetitions.

Example:

Hold Duration: 30 seconds

Sets: 3

Rest Time: 30 seconds

6.5 Exercise Instructions

Before the session begins, the system should display basic instructions for the selected exercise.

Example for Push Up:

Position the camera from the side.

Make sure your entire body is visible.

Keep your body straight.

Lower your body until the correct elbow angle is reached.

Fully extend your arms when returning to the top position.

6.6 Camera Position

PoseFit should primarily use a side view for biomechanical evaluation.

The side view allows the system to clearly observe landmarks involving the:

Shoulder

Elbow

Wrist

Hip

Knee

Ankle

Before starting, PoseFit should display:

Position yourself sideways to the camera and make sure your entire body is visible.

6.7 Start Now

After completing the setup, the user clicks Start Now.

The system should:

Request camera permission if necessary.

Check whether the user is visible.

Activate pose detection.

Redirect the user to the Exercise Session interface.

7. Exercise Session

The Exercise Session is the primary real time exercise evaluation interface.

The camera feed should occupy the largest portion of the screen.

7.1 Camera Display

The camera should display:

Live Camera Feed

Pose Skeleton

Detected Body Landmarks

Joint Connections

Corrective Feedback

Relevant Joint Angles when needed

The skeleton or interface may indicate whether the current posture is:

Correct

Warning

Incorrect

7.2 Session Information

The following information should remain visible while exercising:

Current Repetitions

Target Repetitions

Current Set

Total Sets

Exercise Timer

Rest Timer

Current Feedback

End Session Button

Example:

Reps: 7 / 10
Set: 2 / 3
Time: 05:32

7.3 Real Time Corrective Feedback

PoseFit should evaluate joint angles continuously while the exercise is being performed.

Possible feedback includes:

Squat deeper.

Bend your knees more.

Keep your body straight.

Lower your chest.

Fully extend your arms.

Raise your hips slightly.

Lower your hips slightly.

Keep your upper body upright.

Raise your upper body further.

Keep your knees stable.

Feedback should be short and understandable so the user can immediately respond while exercising.

7.4 Repetition Counting

PoseFit should not count repetitions based only on movement.

A repetition should only be counted when the expected movement sequence is completed.

Example for Squat:

Standing → Valid Bottom Position → Standing

Example for Push Up:

Top Position → Valid Bottom Position → Top Position

This prevents small or incomplete movements from being counted as full repetitions.

7.5 Set Management

PoseFit automatically tracks completed sets.

Example:

Set 1 of 3

When the target number of repetitions is completed:

The set is marked as complete.

Rep counting temporarily stops.

The rest timer starts.

The user receives a notification.

The next set begins after the rest period.

Example:

Set 1 Complete. Rest for 30 seconds.

7.6 Rest Timer

The rest timer uses the duration selected during Exercise Setup.

Example:

Rest Time Remaining
00:28

Optional controls may include:

Skip Rest

Pause

Continue

7.7 End Session

An End Session button must remain accessible during the workout.

When selected, PoseFit should display a confirmation:

Are you sure you want to end this session?

Options:

Continue Workout

End Session

If the user confirms, available workout data should be processed and saved.

8. Biomechanical Exercise Detection

PoseFit evaluates exercise form using joint angles calculated from MediaPipe body landmarks.

The following thresholds are based on studies included in the Review of Related Literature.

8.1 Squat

Primary Measurement

PoseFit calculates the:

Hip → Knee → Ankle angle

This represents knee flexion during the squat.

Target Angle

Based on Kumaresan and Asmawi (2026):

Correct squat knee angle: approximately 80° to 100°

Knee Angle

Classification

Below 80°

Possible over flexion

80° to 100°

Correct squat depth

Above 100°

Insufficient squat depth

Movement States

Standing

The knees are mostly extended.

Descending

The knee angle decreases as the user lowers the body.

Bottom Position

The knee reaches approximately 80° to 100°.

Ascending

The knee angle increases as the user returns to standing.

Repetition Rule

A valid repetition follows:

Standing → Descending → Valid Bottom Position → Standing

Corrective Feedback

If the lowest detected knee angle remains above 100°:

Squat deeper.

If excessive knee flexion is detected:

Avoid excessive knee flexion.

PoseFit may additionally monitor hip and trunk alignment when reliable landmarks are available.

8.2 Push Up

Primary Measurement

PoseFit calculates the:

Shoulder → Elbow → Wrist angle

Top Position

According to Park et al. (2020):

Elbow angle should exceed 150°.

This represents the extended arm position.

Bottom Position

The elbow should fall below:

90°

An optimal bottom position of approximately:

50° to 70°

was also identified.

Repetition Rule

A valid Push Up follows:

Top >150° → Bottom <90° → Top >150°

Body Alignment

PoseFit should calculate:

Shoulder → Hip → Ankle angle

Proper body alignment should remain approximately:

160° to 180°

Arm Symmetry

When both arms can be reliably detected, the difference between left and right arm angles should preferably remain:

Below 30°

Corrective Feedback

If the bottom elbow angle remains above 90°:

Lower your body further.

If the user does not return above 150°:

Fully extend your arms.

If body alignment is outside the accepted range:

Keep your body straight.

If excessive arm asymmetry is detected:

Keep your arms balanced.

8.3 Plank

The Plank is primarily evaluated using posture and hold duration rather than repetitions.

Primary Measurement

PoseFit calculates:

Shoulder → Hip → Ankle angle

According to Kagdi and Van Der Haar (2025), proper alignment should approximately fall between:

170° and 210°

Body Angle

Classification

Below 170°

Low back or hip drop

170° to 210°

Acceptable plank alignment

Above 210°

High back or raised hips

Valid Hold Timer

PoseFit may maintain two timers:

Total Session Time

Valid Plank Hold Time

The valid timer should count only while the user's posture remains within the accepted range.

Example:

Valid Hold Time: 00:42

Corrective Feedback

If the angle is below 170°:

Raise your hips slightly.

If the angle is above 210°:

Lower your hips slightly.

If the posture is correct:

Good plank position.

García Jaén et al. (2023) supports body alignment monitoring because changes in plank positioning influence core muscle activation.

8.4 Forward Lunge

Primary Measurement

PoseFit calculates the:

Hip → Knee → Ankle angle of the front leg

Biomechanical studies demonstrate that the bottom phase of a Forward Lunge approaches approximately 90° of front knee flexion.

Mohamed Sabadri et al. (2023) reported approximately:

82.91° to 84.31°

Shin et al. (2026) standardized the holding phase at approximately:

90°

Goulette et al. (2021) reported peak knee flexion of approximately:

103° ± 7.4°

PoseFit Target

PoseFit should use a target centered around:

Approximately 90° of front knee flexion

Natural movement variability should be allowed rather than requiring exactly 90°.

The final accepted tolerance should be validated during system testing.

Repetition Rule

A valid Forward Lunge follows:

Standing → Lunge Forward → Valid Knee Flexion → Return to Standing

Additional Alignment

PoseFit should monitor:

Upright trunk position

Controlled knee movement

Stable posture

Corrective Feedback

If insufficient knee flexion is detected:

Lower your body further.

If excessive depth is detected:

Avoid lowering excessively.

If excessive trunk leaning occurs:

Keep your upper body upright.

8.5 Sit Up

The Sit Up involves trunk flexion followed by increased hip flexion.

Raiola et al. (2020) describes the Sit Up as a biomechanical sequence involving lumbar and hip flexion.

Rahmadani et al. (2022) identified the hip and knee as important joints for evaluating Sit Up form.

Hip Measurement

PoseFit calculates:

Shoulder → Hip → Knee

At the upper phase:

Hip angle should fall below approximately 90°.

Knee Measurement

PoseFit calculates:

Hip → Knee → Ankle

The knee should remain approximately:

90°

during the exercise.

Movement States

Starting Position

The upper body is close to the floor.

Ascending

The hip angle decreases as the upper body moves toward the knees.

Top Position

The hip angle reaches the target threshold.

Descending

The user returns toward the starting position.

Repetition Rule

A valid Sit Up follows:

Starting Position → Valid Upper Position → Starting Position

Corrective Feedback

If the hip angle does not reach the required range:

Raise your upper body further.

If excessive knee movement is detected:

Keep your knees stable.

If the movement is incomplete:

Complete the full Sit Up movement.

8.6 Exercise Detection Summary

Exercise

Measurement

Target

Squat

Hip → Knee → Ankle

80° to 100° knee angle

Push Up

Shoulder → Elbow → Wrist

Below 90° bottom, above 150° top

Push Up Alignment

Shoulder → Hip → Ankle

160° to 180°

Plank

Shoulder → Hip → Ankle

170° to 210°

Forward Lunge

Hip → Knee → Ankle

Approximately 90° front knee flexion

Sit Up

Shoulder → Hip → Knee

Hip angle below approximately 90°

Sit Up Knee

Hip → Knee → Ankle

Approximately 90°

These thresholds provide the initial biomechanical basis of PoseFit and should be verified during system testing and accuracy validation.

9. Accuracy and Session Results

After the workout is completed, PoseFit redirects the user to the Session Results Page.

9.1 Accuracy Calculation

For repetition based exercises, a basic session accuracy may be calculated using:

Accuracy = Correct Repetitions / Total Detected Repetitions × 100

Example:

Correct Repetitions: 18
Total Repetitions: 20

Accuracy = 18 / 20 × 100
Accuracy = 90%

Additional factors may include:

Joint angle compliance

Movement completion

Alignment violations

Posture violations

For the Plank, accuracy may instead represent the percentage of exercise time during which the user's alignment remained within the accepted range.

The final accuracy formula should remain consistent throughout development, Alpha Testing, and system evaluation.

9.2 Session Summary

The End Session Page should display:

Exercise Name

Date

Start Time

End Time

Total Exercise Duration

Total Sets

Total Repetitions

Correct Repetitions

Incorrect Repetitions

Exercise Accuracy

Example:

Push Up Session

Duration: 14 minutes

Sets: 3

Repetitions: 30

Correct Repetitions: 27

Incorrect Repetitions: 3

Accuracy: 90%

9.3 Accuracy Report

PoseFit should provide a more detailed analysis depending on the exercise.

Squat

Squat Depth

Knee Angle

Movement Completion

Posture Alignment

Push Up

Elbow Depth

Arm Extension

Body Alignment

Symmetry

Plank

Hip Alignment

Body Alignment

Valid Hold Time

Forward Lunge

Knee Flexion

Trunk Alignment

Movement Completion

Sit Up

Hip Flexion

Knee Stability

Movement Completion

Example:

Overall Accuracy: 90%

Correct Depth: 93%
Full Extension: 90%
Body Alignment: 87%
Movement Completion: 91%

9.4 Session Comparison

PoseFit should compare the current session with the most recent previous session of the same exercise.

Possible comparisons include:

Accuracy

Repetitions

Sets

Exercise Duration

Correct Repetitions

Incorrect Repetitions

Example:

Previous Push Up Accuracy: 84%
Current Push Up Accuracy: 90%

PoseFit may display:

Your Push Up accuracy improved by 6 percentage points compared with your previous session.

Other examples:

You completed 5 more repetitions than your previous workout.

You exercised 4 minutes longer than your previous session.

You reduced incorrect repetitions from 6 to 3.

If no previous session exists:

This is your first recorded Push Up session. Future workouts will be compared with this result.

9.5 Save Session

Completed workout sessions should automatically be stored in the database.

Suggested stored data:

User ID

Exercise ID

Date

Start Time

End Time

Duration

Sets

Repetitions

Correct Repetitions

Incorrect Repetitions

Accuracy Score

Detected Errors

Generated Feedback

This information supports:

Dashboard Statistics

Progress Reports

Workout History

Session Comparison

Gemini Feedback

10. Gemini Generated Feedback

After the workout ends, processed exercise results should be sent to the Gemini API.

Gemini should not perform the biomechanical exercise evaluation.

The PoseFit computer vision system should first determine:

Exercise performed

Total repetitions

Correct repetitions

Incorrect repetitions

Sets

Exercise duration

Accuracy

Common detected errors

Previous session performance

Gemini should only use these results to generate understandable and personalized feedback.

Example Data Sent to Gemini

{
  "exercise": "Push Up",
  "sets": 3,
  "repetitions": 30,
  "correct_repetitions": 27,
  "incorrect_repetitions": 3,
  "accuracy": 90,
  "duration_minutes": 14,
  "common_errors": [
    "Incomplete elbow extension",
    "Hip dropped during several repetitions"
  ]
}

Example Generated Feedback

Great session. You completed 30 Push Ups across three sets with an overall form accuracy of 90%. Your elbow depth was consistent, but several repetitions showed incomplete arm extension and slight hip dropping. Focus on fully extending your arms at the top while maintaining straight body alignment.

Gemini Failure Handling

The Session Results Page must continue to work even if the Gemini API is unavailable.

If the Gemini request fails:

Save the workout normally.

Display the PoseFit accuracy report.

Display the detected errors.

Allow Gemini feedback generation to fail independently without losing the session.

11. Workout Plan

The Workout Plan Page allows users to create exercise schedules for the current and upcoming weeks.

11.1 Weekly Calendar

Display:

Monday

Tuesday

Wednesday

Thursday

Friday

Saturday

Sunday

Users can assign one or more PoseFit exercises to each day.

Example:

Day

Exercise

Monday

Squat and Push Up

Tuesday

Rest

Wednesday

Forward Lunge and Sit Up

Thursday

Rest

Friday

Squat, Push Up and Plank

Saturday

Plank

Sunday

Rest

11.2 Create Workout

For each scheduled exercise, users should configure:

Exercise

Repetitions

Sets

Rest Duration

Plank Hold Duration when applicable

Example:

Monday

Squat

12 Repetitions

3 Sets

45 Second Rest

Push Up

10 Repetitions

3 Sets

60 Second Rest

11.3 Workout Plan Functions

Users should be able to:

Create Workout

Edit Workout

Delete Workout

Move Workout

Duplicate Workout

Mark Workout as Completed

11.4 Upcoming Weeks

Users should be able to prepare workout plans for future weeks.

The system should clearly distinguish:

Current Week

Upcoming Week

Previous Week

11.5 Planned Workout Session

If a workout contains multiple exercises, PoseFit should guide the user through them sequentially.

Example:

Monday Workout

1. Squat
2. Push Up
3. Plank

After completing Squat:

Squat Complete. Next Exercise: Push Up.

The user may:

Continue to Next Exercise

Take Rest

End Workout

12. Workout History and Progress

12.1 Workout History

The History Page stores previously completed workout sessions.

Each entry should display:

Date

Exercise

Sets

Repetitions

Accuracy

Duration

Session Status

Example:

Date

Exercise

Sets

Reps

Accuracy

Duration

Aug 20

Push Up

3

30

90%

14 min

Aug 19

Squat

4

40

92%

18 min

Aug 18

Plank

3

N/A

88%

8 min

12.2 History Filters

Users may filter workout history by:

Exercise

Date

Week

Month

Accuracy

12.3 Session Details

Selecting a workout history record should display:

Session Summary

Accuracy Report

Sets

Repetitions

Duration

Detected Errors

Gemini Feedback

Previous Session Comparison

12.4 Progress Tracking

PoseFit should use workout history to generate progress statistics.

Possible metrics include:

Weekly Average Accuracy

Monthly Average Accuracy

Total Exercise Duration

Total Completed Workouts

Total Repetitions

Accuracy Improvement

Workout Consistency

Exercise Frequency

These statistics should be used by the Dashboard and Progress Report.

13. Responsive Design

PoseFit must provide a responsive interface that adjusts to the user's device.

13.1 Desktop and Laptop

Suggested interface:

Sidebar Navigation

Large Dashboard Cards

Multi Column Layout

Large Camera Area

Side Exercise Information Panel

Full Progress Charts

13.2 Tablet

Suggested interface:

Reduced Number of Columns

Responsive Dashboard Cards

Touch Friendly Controls

Adjustable Camera Area

13.3 Mobile

Suggested interface:

Single Column Layout

Bottom Navigation or Mobile Menu

Large Touch Friendly Buttons

Responsive Cards

Full Width Camera

Simplified Exercise Controls

During exercise sessions, important information must remain visible without significantly blocking the user's camera feed.

Essential information:

Repetitions

Current Set

Timer

Corrective Feedback

End Session

13.4 Camera Responsiveness

The camera component must dynamically resize according to the device.

Requirements:

Video should not appear stretched.

Body landmarks should stay aligned with the video.

Skeleton overlays should scale with the camera.

The user's entire body should remain visible.

Controls should not cover important body landmarks.

Portrait and landscape layouts should be considered for mobile devices.

14. System Architecture

PoseFit should clearly separate the responsibilities of the frontend, backend, computer vision logic, and Gemini integration.

14.1 Frontend Responsibilities

The React frontend should handle:

User Interface

Dashboard

Exercise Selection

Exercise Setup

Camera Interface

Real Time Pose Visualization

Exercise Counters

Timers

Corrective Feedback Display

Workout Planning Interface

History Interface

Responsive Design

14.2 MediaPipe Responsibilities

MediaPipe is responsible for:

Detecting body landmarks

Tracking body position

Providing landmark coordinates to PoseFit

MediaPipe does not independently determine whether an exercise is correct.

14.3 PoseFit Biomechanical Logic

PoseFit's exercise logic is responsible for:

Joint Angle Calculation

Movement State Detection

Repetition Counting

Exercise Form Classification

Posture Error Detection

Corrective Feedback Rules

Exercise Accuracy Calculation

14.4 Backend Responsibilities

The Django backend should handle:

User Authentication

User Profiles

Workout Plans

Workout Session Storage

Workout History

Progress Tracking

Accuracy Report Storage

Session Comparison

Gemini API Communication

14.5 Database

PostgreSQL should store persistent PoseFit information.

Suggested main entities include:

User
UserProfile
Exercise
WorkoutPlan
WorkoutPlanExercise
WorkoutSession
ExerciseSet
ExercisePerformance
DetectedError
AccuracyReport
GeneratedFeedback
LoginActivity

14.6 Gemini Responsibilities

Gemini is responsible for:

Summarizing completed workout results

Explaining common detected errors

Highlighting improvements

Providing understandable post workout feedback

Gemini should not replace PoseFit's angle based biomechanical evaluation.

14.7 Suggested Frontend Components

Navbar
Sidebar
MobileNavigation
DashboardCard
ProgressChart
WeeklyActivityChart
ExerciseCard
ExerciseSetupForm
CameraFeed
PoseOverlay
RepCounter
SetCounter
ExerciseTimer
RestTimer
FeedbackDisplay
AccuracyIndicator
WorkoutSummary
AccuracyReport
SessionComparison
GeminiFeedback
WorkoutCalendar
WorkoutPlanCard
HistoryTable
HistoryCard
ResponsiveModal
ConfirmationDialog

15. Core System Requirements

The completed PoseFit system should provide the following features.

User Account

User Registration

Secure Login

User Profile

Privacy Consent

Dashboard

User Greeting

Login Streak

Seven Day Exercise Bar Graph

Progress Report

Recent Workout

Today's Workout

Quick Actions

Exercises

Squat

Push Up

Plank

Forward Lunge

Sit Up

Exercise Setup

Repetition Configuration

Set Configuration

Rest Time Configuration

Plank Hold Duration

Exercise Instructions

Camera Position Instructions

Computer Vision

Webcam Pose Detection

Body Landmark Detection

Skeleton Overlay

Joint Angle Calculation

Exercise Movement Detection

Form Classification

Exercise Session

Automatic Repetition Counting

Automatic Set Tracking

Exercise Timer

Rest Timer

Plank Timer

Corrective Feedback

Manual End Session

Results

Exercise Accuracy

Accuracy Report

Session Summary

Previous Session Comparison

Gemini Generated Feedback

Workout Planning

Weekly Workout Plan

Upcoming Workout Plan

Add Workout

Edit Workout

Delete Workout

Start Planned Workout

History and Progress

Workout History

Session Details

Weekly Statistics

Progress Reports

Accuracy Trends

Compatibility

Desktop

Laptop

Tablet

Mobile

16. Development Phases

To make PoseFit development manageable, implementation should be completed in phases.

Phase 1: Authentication and User System

Implement:

Signup

Login

Authentication

User Profile

Phase 2: Dashboard

Implement:

Dashboard Layout

Login Streak

Seven Day Exercise Graph

Progress Cards

Recent Workout

Today's Workout

Phase 3: Exercise Interface

Implement:

Exercise Selection

Exercise Cards

Exercise Setup

Repetitions

Sets

Rest Duration

Plank Hold Duration

Camera Instructions

Phase 4: Computer Vision

Implement:

MediaPipe Pose

Webcam Access

Landmark Detection

Skeleton Overlay

Joint Angle Calculation

Phase 5: Exercise Logic

Implement exercises individually:

Squat

Push Up

Plank

Forward Lunge

Sit Up

For each exercise, implement:

Movement States

Angle Thresholds

Correct Form Rules

Incorrect Form Rules

Repetition or Hold Detection

Corrective Feedback

Phase 6: Session Management

Implement:

Rep Counter

Set Counter

Exercise Timer

Rest Timer

End Session

Session Storage

Phase 7: Accuracy and Reports

Implement:

Accuracy Calculation

Exercise Performance Breakdown

Session Summary

Session Comparison

Phase 8: Gemini Integration

Implement:

Session Data Preparation

Gemini API Request

Generated Feedback

Gemini Error Handling

PoseFit should remain usable even if Gemini is unavailable.

Phase 9: Workout Planning

Implement:

Weekly Calendar

Add Workout

Edit Workout

Delete Workout

Upcoming Week

Planned Workout Sessions

Phase 10: History and Progress

Implement:

Workout History

Session Details

Weekly Progress

Seven Day Exercise Graph

Accuracy Trends

Dashboard Statistics

Phase 11: Responsive Design and Optimization

Test and optimize PoseFit for:

Desktop

Laptop

Tablet

Mobile

Verify:

Camera Scaling

Pose Overlay Scaling

Navigation

Touch Controls

Dashboard Charts

Exercise Cards

Exercise Session Controls

Results Page

17. Scientific Basis

The biomechanical rules used by PoseFit are grounded in the studies included in the project's Review of Related Literature.

Squat

Wijayanti et al. (2024) supports the use of knee and hip positioning as measurable indicators of squat biomechanics.

Kumaresan and Asmawi (2026) provides the 80° to 100° knee angle range used for squat depth classification.

Push Up

Park et al. (2020) provides biomechanical rules for elbow angle, body alignment, wrist to shoulder distance, and arm symmetry.

Kowalski et al. (2021) supports the importance of joint position in Push Up muscle activation.

Plank

García Jaén et al. (2023) supports monitoring body alignment because alignment affects core muscle activation.

Kagdi and Van Der Haar (2025) provides the 170° to 210° shoulder hip ankle alignment range.

Forward Lunge

Mohamed Sabadri et al. (2023) reports knee angles of approximately 82.91° to 84.31° during maximum descent.

Shin et al. (2026) uses approximately 90° of front knee flexion with an upright trunk.

Goulette et al. (2021) reports peak knee flexion of approximately 103° ± 7.4° and demonstrates the biomechanical importance of knee flexion.

Sit Up

Raiola et al. (2020) describes Sit Up movement through trunk and hip flexion.

Rahmadani et al. (2022) supports using hip and knee angles for Sit Up evaluation, including a hip angle below approximately 90° and knee positioning near 90°.

These findings provide the scientific foundation for PoseFit's angle based exercise evaluation system.

Expected Final User Experience

The complete PoseFit experience should follow a simple user flow:

Open PoseFit → Login → View Dashboard → Select Exercise → Configure Workout → Position Camera → Perform Exercise → Receive Real Time Feedback → Complete Sets → View Accuracy Report → Receive Gemini Feedback → Compare Performance → Review History → Plan Future Workouts

The computer vision, biomechanical calculations, database operations, and AI processing should operate behind the interface without requiring the user to understand the underlying technical implementation.