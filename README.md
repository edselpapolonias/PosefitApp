# PoseFit System Implementation Plan

## 1. Project Overview

**PoseFit** is a computer vision based web application designed to evaluate exercise form in real time using pose estimation and biomechanical joint angle analysis.

The system allows users to perform five supported exercises:

1. Squat
2. Push Up
3. Plank
4. Forward Lunge
5. Leg Raise

PoseFit will use the device camera to detect body landmarks, calculate relevant joint angles, count repetitions, monitor exercise sets, evaluate exercise form, provide real time corrective feedback, and generate a post workout analysis.

The web application must be responsive and adaptable to different screen sizes, including:

- Desktop computers
- Laptops
- Tablets
- Mobile devices

The interface should automatically adjust its layout according to the available screen size while maintaining access to all important functions.

---

# 2. Main System Flow

The general flow of PoseFit will be:

**Login or Signup → Dashboard → Exercise Selection or Workout Plan → Exercise Setup → Camera Exercise Session → End Session → Exercise Analysis → Progress Recording → History**

For a normal exercise session:

1. User logs in.
2. User selects an exercise.
3. User configures repetitions, sets, and rest time.
4. User starts the exercise.
5. PoseFit activates the camera.
6. MediaPipe detects body landmarks.
7. The system calculates joint angles.
8. PoseFit determines whether the exercise form is correct.
9. Repetitions and sets are automatically recorded.
10. Corrective feedback is displayed during the exercise.
11. The user finishes the session.
12. Session information is processed.
13. Exercise results are sent to the Gemini API.
14. Gemini generates personalized session feedback.
15. PoseFit displays the session results and accuracy report.
16. The completed workout is stored in the user's history.
17. Dashboard statistics and progress reports are updated.

---

# 3. Authentication

## 3.1 Login Page

The Login Page allows registered users to access their PoseFit account.

### Required Fields

- Email Address
- Password

### Functions

- Login
- Show or Hide Password
- Redirect to Signup Page
- Form Validation
- Invalid Credential Notification

### Successful Login

After successful authentication, the user will be redirected to the **Dashboard**.

---

## 3.2 Signup Page

The Signup Page allows new users to create their PoseFit account.

### Suggested Fields

- Full Name
- Email Address
- Password
- Confirm Password

### Functions

- Account Registration
- Email Validation
- Password Validation
- Password Confirmation
- Duplicate Email Detection
- Terms and Privacy Consent

After registration, the user may be automatically logged in or redirected to the Login Page.

---

# 4. Dashboard

The Dashboard serves as the main overview of the user's exercise activity and progress.

It should provide users with a quick understanding of their recent performance.

## 4.1 Dashboard Components

### User Greeting

Example:

> Good morning, Alex! Ready for today's workout?

## 4.2 Login Streak

Display the number of consecutive days the user has accessed PoseFit.

Example:

**🔥 7 Day Login Streak**

The streak can encourage users to consistently use the system.

## 4.3 Weekly Exercise Bar Graph

Display the user's total exercise duration for the previous seven days.

Example data:

| Day | Exercise Duration |
| --- | ---: |
| Monday | 30 minutes |
| Tuesday | 20 minutes |
| Wednesday | 0 minutes |
| Thursday | 45 minutes |
| Friday | 25 minutes |
| Saturday | 60 minutes |
| Sunday | 35 minutes |

The graph should automatically update whenever a workout session is completed.

## 4.4 Progress Report

The Dashboard should summarize the user's progress.

Possible statistics include:

- Total workouts completed
- Total exercise minutes
- Total repetitions
- Total sets
- Average exercise accuracy
- Highest recorded accuracy
- Current workout streak
- Number of workouts completed this week

Example:

> **Weekly Progress**
>
> 4 Workouts Completed  
> 125 Total Minutes  
> 320 Total Repetitions  
> 89% Average Form Accuracy

## 4.5 Recent Workout

Display the user's most recently completed exercise.

Example:

**Push Up**

- 3 Sets
- 30 Repetitions
- 88% Accuracy
- 12 Minutes

A button can allow the user to open the complete session result.

## 4.6 Quick Actions

Suggested dashboard buttons:

- Start Exercise
- View Workout Plan
- View History
- View Progress

---

# 5. Exercise Selection Page

The Exercise Selection Page displays the five exercises currently supported by PoseFit.

The exercises are:

1. Squat
2. Push Up
3. Plank
4. Forward Lunge
5. Leg Raise

Each exercise may be represented using a card containing:

- Exercise Name
- Exercise Image or Illustration
- Short Description
- Target Body Area
- Start Exercise Button

Example:

### Leg Raise

Strengthens the hip flexors and abdominal region while monitoring hip flexion and leg extension.

**Start Exercise**

---

# 6. Exercise Setup Page

After choosing an exercise, the user will first configure their workout before activating the camera.

## 6.1 Configuration Options

### Repetitions

The user selects the number of repetitions per set.

Example:

`10 Repetitions`

### Sets

The user selects the number of sets.

Example:

`3 Sets`

### Rest Time

The user selects how long the rest period should be after completing each set.

Examples:

- 15 seconds
- 30 seconds
- 45 seconds
- 60 seconds
- 90 seconds

The system may also allow a custom rest duration.

## 6.2 Plank Configuration

Because Plank is time based, the setup should use hold duration instead of repetitions.

Example:

- Hold Duration: 30 seconds
- Sets: 3
- Rest Time: 30 seconds

## 6.3 Exercise Information

Before starting, the system should show basic instructions.

Example for Leg Raise:

- Position the camera from the side.
- Lie flat on your back.
- Make sure your full body is visible.
- Keep both legs extended.
- Raise the legs using controlled hip flexion.
- Avoid excessive knee bending.
- Lower the legs in a controlled manner.

## 6.4 Start Now

After completing the configuration, the user presses:

**Start Now**

The system will request permission to access the camera and redirect the user to the Exercise Camera Page.

---

# 7. Camera Exercise Session

The Camera Exercise Session is the primary real time exercise evaluation interface.

The camera feed should occupy the largest portion of the interface.

The system will use pose estimation to detect the user's body landmarks.

## 7.1 Camera Display

The camera should display:

- Live Camera Feed
- Pose Skeleton
- Detected Body Landmarks
- Joint Connections
- Angle Information when necessary

The skeleton overlay may visually indicate form status.

Example:

- Correct posture indicator
- Warning indicator
- Incorrect posture indicator

---

# 8. Exercise Session Information

The following information should remain visible during the exercise:

### Repetition Counter

Example:

**Reps: 7 / 10**

### Current Set

Example:

**Set: 2 / 3**

### Exercise Timer

Example:

**Time: 05:32**

### Exercise Accuracy

Optional real time indicator:

**Current Form: 91%**

### Rest Timer

When a set is completed:

**Rest: 00:30**

### End Session Button

Users must be able to manually end the workout at any time.

---

# 9. Real Time Corrective Feedback

PoseFit should analyze detected joint angles while the exercise is being performed.

If incorrect exercise form is detected, the system displays corrective feedback.

Examples:

- Bend your knees more.
- Squat deeper.
- Keep your back straight.
- Lower your chest.
- Fully extend your elbows.
- Lower your hips.
- Raise your hips slightly.
- Bend your front knee.
- Keep your trunk upright.
- Raise your legs higher.
- Keep your knees straight.
- Lower your legs slowly.

The feedback should be short and understandable so users can respond while exercising.

---

# 10. Biomechanical Exercise Detection

PoseFit will evaluate exercise form using joint angles calculated from detected body landmarks.

These biomechanical rules are based on the studies included in the Review of Related Literature.

---

# 11. Squat Detection

## Primary Joint Measurement

PoseFit will calculate the:

**Hip → Knee → Ankle angle**

This represents the knee flexion angle during the squat.

## Target Squat Angle

Based on Kumaresan and Asmawi (2026):

**Correct squat knee angle: approximately 80° to 100°**

### Classification

| Knee Angle | Interpretation |
| --- | --- |
| Below 80° | Possible over flexion |
| 80° to 100° | Correct squat depth |
| Above 100° | Insufficient squat depth |

## Squat Movement States

### Standing Position

The user begins with the knees mostly extended.

### Descending

The knee angle gradually decreases as the user lowers the body.

### Bottom Position

The knee angle reaches approximately:

**80° to 100°**

### Ascending

The knee angle increases as the user returns to standing.

### Repetition Completion

One repetition is counted when the user completes:

**Standing → Descending → Valid Squat Depth → Standing**

## Possible Squat Feedback

If the lowest detected knee angle remains above 100°:

> Squat deeper.

If knee flexion falls significantly below the target:

> Avoid excessive knee flexion.

PoseFit may additionally monitor hip and trunk alignment when reliable landmarks are available.

---

# 12. Push Up Detection

The Push Up primarily uses elbow angle and body alignment.

## Primary Joint Measurement

PoseFit calculates:

**Shoulder → Elbow → Wrist angle**

## Top Position

According to Park et al. (2020):

**Elbow angle should exceed 150°.**

This represents an extended arm position.

## Bottom Position

The elbow angle should fall below:

**90°**

The study identified approximately:

**50° to 70°**

as an optimal bottom range.

## Push Up Repetition

A repetition may be counted using:

**Top Position >150° → Bottom Position <90° → Top Position >150°**

## Body Alignment

PoseFit should also monitor the user's body alignment.

Park et al. (2020) identified approximately:

**160° to 180°**

for maintaining a straight body posture.

This can be calculated using:

**Shoulder → Hip → Ankle**

## Arm Symmetry

If both sides of the body are reliably visible, the difference between left and right arm angles should preferably remain:

**Below 30°**

## Possible Push Up Feedback

If the bottom elbow angle remains greater than 90°:

> Lower your body further.

If the user does not return above 150°:

> Fully extend your arms.

If body alignment falls outside the accepted straight posture range:

> Keep your body straight.

If arm asymmetry exceeds the acceptable threshold:

> Keep your arms balanced.

---

# 13. Plank Detection

Unlike the other exercises, the Plank is primarily time based instead of repetition based.

## Primary Alignment Measurement

PoseFit calculates:

**Shoulder → Hip → Ankle angle**

According to Kagdi and Van Der Haar (2025), proper plank alignment should approximately fall between:

**170° and 210°**

## Plank Classification

| Body Angle | Interpretation |
| --- | --- |
| Below 170° | Low back or hip drop |
| 170° to 210° | Acceptable plank alignment |
| Above 210° | High back or hips raised |

## Plank Timer

The valid plank timer may only continue while proper posture is detected.

Example:

**Valid Plank Time: 00:42**

The total session timer may continue separately.

## Possible Plank Feedback

If angle is below 170°:

> Raise your hips slightly.

If angle is above 210°:

> Lower your hips slightly.

If alignment is within the accepted range:

> Good plank position.

García Jaén et al. (2023) supports monitoring body alignment because changes in plank positioning affect core muscle activation.

---

# 14. Forward Lunge Detection

PoseFit will primarily evaluate the front leg knee angle during the bottom phase of the lunge.

## Primary Joint Measurement

**Hip → Knee → Ankle angle of the front leg**

Biomechanical studies indicate that the bottom phase of a Forward Lunge commonly approaches approximately:

**90° of front knee flexion**

Mohamed Sabadri et al. (2023) reported mean knee angles of approximately:

**82.91° to 84.31°**

Shin et al. (2026) standardized the Forward Lunge holding phase at approximately:

**90°**

Goulette et al. (2021) reported peak knee flexion of approximately:

**103° ± 7.4°**

## Proposed PoseFit Target

Instead of requiring exactly 90°, PoseFit should allow natural movement variability.

A practical target can be centered around:

**Approximately 90° knee flexion**

with an accepted tolerance determined during system testing and validation.

## Movement Sequence

A Lunge repetition can follow:

**Standing → Step or Lunge Forward → Reach Target Knee Flexion → Return to Standing**

## Additional Alignment

PoseFit should monitor:

- Upright trunk position
- Controlled front knee movement
- Stable body posture

## Possible Lunge Feedback

If the user does not reach sufficient knee flexion:

> Lower your body further.

If the user exceeds the acceptable movement range:

> Avoid lowering excessively.

If excessive trunk leaning is detected:

> Keep your upper body upright.

---

# 15. Leg Raise Detection

The Leg Raise primarily involves hip flexion while the legs remain extended.

Juan et al. (2024) conducted a systematic review examining hip flexor muscle activation during rehabilitation and strengthening exercises. Their findings showed that the iliopsoas, one of the primary muscles involved in hip flexion, becomes increasingly active as the leg is raised.

Greater muscle activation was observed between:

**30° and 60° of hip flexion**

compared with the:

**0° to 30° range**

during active Straight Leg Raise exercises.

Substantial iliopsoas activation was also reported at approximately:

**60° of hip flexion**

during Straight Leg Raise and Leg Lift exercises.

These findings support the use of hip flexion angle as a measurable indicator for PoseFit's Leg Raise evaluation.

## Primary Joint Measurement

PoseFit should monitor hip flexion using landmarks around the:

**Shoulder → Hip → Knee**

or another equivalent hip flexion angle representation based on the coordinate system used during implementation.

The system should ensure that the selected angle calculation consistently represents the amount of leg elevation.

## Hip Flexion Range

The following range can serve as the initial biomechanical basis:

| Hip Flexion | Interpretation |
| --- | --- |
| 0° to below 30° | Early or low raising phase |
| 30° to 60° | Effective hip flexion range |
| Approximately 60° | Target raised position |
| Above selected upper tolerance | Possible excessive elevation |

The final acceptable tolerance should be verified through system testing.

## Leg Extension

Because the exercise is performed as a straight Leg Raise, PoseFit should also monitor whether the knee remains extended.

A possible secondary measurement is:

**Hip → Knee → Ankle angle**

The knee angle should remain close to a straight position during the movement.

An implementation threshold for knee extension should be established and validated during system testing rather than being assigned solely from the Juan et al. (2024) findings.

## Movement States

### Starting Position

The user lies flat with the legs close to the floor.

Hip flexion is approximately:

**0° or near the resting position**

### Raising Phase

The user raises the legs while keeping them extended.

Hip flexion gradually increases.

### Valid Raised Position

The legs reach approximately:

**30° to 60° of hip flexion**

with approximately **60°** serving as the main target position.

### Lowering Phase

The user lowers the legs in a controlled manner toward the starting position.

### Repetition Completion

One repetition may be counted when the user completes:

**Starting Position → Raising Phase → Valid Raised Position → Return to Starting Position**

## Possible Leg Raise Feedback

If the user does not reach sufficient hip flexion:

> Raise your legs higher.

If the user bends the knees excessively:

> Keep your knees straight.

If the user raises the legs beyond the validated upper limit:

> Avoid raising your legs too high.

If the user lowers the legs too quickly:

> Lower your legs slowly and with control.

If the legs remain properly extended and reach the target range:

> Good Leg Raise.

---

# 16. Camera Position

Because the monitored movements primarily occur in the sagittal plane, PoseFit should generally instruct users to position the camera from the:

**Side View**

The side view improves visibility of:

- Shoulder
- Elbow
- Wrist
- Hip
- Knee
- Ankle

The full body must remain inside the camera frame.

For Leg Raise, the camera should be positioned from the side so the system can observe the hip, knee, and ankle while the user is lying down.

Before starting an exercise, PoseFit should provide positioning guidance such as:

> Position yourself sideways to the camera and make sure your entire body is visible.

For Leg Raise:

> Lie sideways relative to the camera view and make sure your upper body, hips, knees, and feet are visible.

---

# 17. Exercise Repetition Counting

PoseFit should not count a repetition based only on body movement.

A repetition should only be considered complete after the expected movement sequence is detected.

Example for Push Up:

**Top → Bottom → Top**

Example for Squat:

**Standing → Correct Depth → Standing**

Example for Leg Raise:

**Starting Position → Valid Raised Position → Starting Position**

This helps prevent incomplete or small movements from being counted as complete repetitions.

---

# 18. Set Management

The system automatically tracks exercise sets.

Example:

**Set 1 of 3**

After the target number of repetitions is completed:

1. The current set ends.
2. The repetition counter temporarily stops.
3. The rest timer begins.
4. The user receives a rest notification.
5. After the rest period finishes, the next set begins.

Example:

> Set 1 Complete  
> Rest for 30 seconds.

After the final set, the system may automatically display:

> Workout Complete

The user can then proceed to the session result.

---

# 19. Rest Timer

The rest timer is based on the duration selected during Exercise Setup.

Display example:

**Rest Time Remaining**

`00:28`

The system may include:

- Skip Rest
- Pause
- Continue

After the countdown reaches zero, PoseFit begins the next set.

---

# 20. End Session

An **End Session** button must always be accessible during the workout.

When clicked, the system should ask:

> Are you sure you want to end this session?

Options:

- Continue Workout
- End Session

If the user confirms, available workout information is saved and the user is redirected to the End Session Page.

---

# 21. Exercise Accuracy Calculation

PoseFit should calculate a session accuracy score based on the number of correctly performed exercise movements compared with detected exercise attempts.

A possible implementation can consider:

- Correct repetitions
- Incorrect repetitions
- Joint angle compliance
- Posture violations
- Alignment violations

Example:

```text
Correct Repetitions: 18
Total Repetitions: 20

Accuracy = 18 / 20 × 100
Accuracy = 90%
```

For Plank, accuracy may instead be determined from the percentage of exercise time where body alignment remained within the acceptable angle range.

For Leg Raise, accuracy may consider:

- Reaching the target hip flexion range
- Maintaining leg extension
- Completing the full movement
- Returning to the starting position

The exact accuracy formula should remain consistent across implementation and system evaluation.

---

# 22. End Session Page

After completing or ending a workout, the user is redirected to the Session Results Page.

The page should display a complete summary of the workout.

## 22.1 Session Summary

Display:

- Exercise Name
- Date
- Start Time
- End Time
- Total Exercise Duration
- Total Sets
- Total Repetitions
- Correct Repetitions
- Incorrect Repetitions
- Exercise Accuracy

Example:

### Leg Raise Session

**Duration:** 10 minutes  
**Sets:** 3  
**Repetitions:** 30  
**Correct Repetitions:** 27  
**Incorrect Repetitions:** 3  
**Accuracy:** 90%

---

# 23. Accuracy Report

The session result should provide a more detailed accuracy analysis.

Example:

### Form Accuracy

**Overall Accuracy: 90%**

### Performance Breakdown

- Target Angle: 93%
- Movement Completion: 90%
- Leg Extension: 87%
- Movement Control: 91%

The available categories should depend on the exercise.

### Squat

- Squat Depth
- Knee Angle
- Movement Completion
- Posture Alignment

### Push Up

- Elbow Depth
- Arm Extension
- Body Alignment
- Symmetry

### Plank

- Hip Alignment
- Body Alignment
- Valid Hold Time

### Lunge

- Knee Flexion
- Trunk Alignment
- Movement Completion

### Leg Raise

- Hip Flexion
- Target Raise Height
- Leg Extension
- Movement Completion
- Movement Control

---

# 24. Gemini Generated Feedback

After the workout ends, summarized exercise results will be sent to the **Gemini API**.

The Gemini API should not perform the actual biomechanical detection.

PoseFit's own computer vision and angle evaluation system should first determine:

- Exercise performed
- Repetitions
- Sets
- Correct repetitions
- Incorrect repetitions
- Accuracy score
- Frequent posture errors
- Exercise duration
- Previous performance

Gemini will use the already processed information to generate understandable feedback.

## Example Information Sent to Gemini

```json
{
  "exercise": "Leg Raise",
  "sets": 3,
  "repetitions": 30,
  "correct_repetitions": 27,
  "incorrect_repetitions": 3,
  "accuracy": 90,
  "duration_minutes": 10,
  "common_errors": [
    "Insufficient hip flexion",
    "Knees bent during several repetitions"
  ]
}
```

## Example Gemini Feedback

> Great session. You completed 30 Leg Raises across three sets with an overall form accuracy of 90%. Most repetitions reached the desired raising range, but several repetitions showed reduced hip flexion and slight knee bending. Focus on keeping your legs extended while raising them with controlled hip movement.

The generated feedback should be treated as an explanation of the measured PoseFit results rather than allowing Gemini to independently determine whether exercise form was correct.

---

# 25. Session Comparison

PoseFit should compare the completed session with the user's most recent session for the same exercise.

Possible comparisons include:

- Accuracy
- Number of repetitions
- Number of sets
- Exercise duration
- Correct repetitions
- Incorrect repetitions

Example:

### Previous Leg Raise Session

Accuracy: **84%**

### Current Leg Raise Session

Accuracy: **90%**

PoseFit displays:

> Your Leg Raise accuracy improved by **6 percentage points** compared with your previous session.

Other examples:

> You completed 5 more repetitions than your previous workout.

> Your workout duration increased by 4 minutes.

> You reduced incorrect repetitions from 6 to 3.

> Your leg extension score improved by 8 percentage points.

If no previous session exists, PoseFit should display:

> This is your first recorded Leg Raise session. Future workouts will be compared with this result.

---

# 26. Save Session

After the result has been generated, the completed workout should automatically be saved to the database.

Stored information may include:

- User ID
- Exercise ID
- Date
- Start Time
- End Time
- Duration
- Number of Sets
- Number of Repetitions
- Correct Repetitions
- Incorrect Repetitions
- Accuracy Score
- Detected Errors
- Gemini Feedback

This information will support the Dashboard, Progress Report, Workout History, and Session Comparison features.

---

# 27. Workout Plan Page

The Workout Plan Page allows users to organize workouts for the current week and upcoming weeks.

Users can build their own workout routine using the five PoseFit exercises.

## 27.1 Weekly Calendar

The interface may display:

- Monday
- Tuesday
- Wednesday
- Thursday
- Friday
- Saturday
- Sunday

Users can assign exercises to each day.

Example:

| Day | Exercise |
| --- | --- |
| Monday | Squat and Push Up |
| Tuesday | Rest |
| Wednesday | Lunge and Leg Raise |
| Thursday | Rest |
| Friday | Squat, Push Up and Plank |
| Saturday | Leg Raise and Plank |
| Sunday | Rest |

---

# 28. Create Workout Plan

When adding an exercise, users should configure:

- Exercise
- Number of Repetitions
- Number of Sets
- Rest Duration
- Plank Duration where applicable

Example:

### Monday

**Squat**

- 12 Repetitions
- 3 Sets
- 45 Second Rest

**Leg Raise**

- 12 Repetitions
- 3 Sets
- 45 Second Rest

---

# 29. Upcoming Workout Plans

Users should be able to prepare routines for upcoming weeks.

Functions may include:

- Create Workout
- Edit Workout
- Delete Workout
- Move Workout
- Duplicate Workout
- Mark Workout as Completed

The Dashboard may show:

> Today's Workout

and provide a:

**Start Workout**

button.

---

# 30. Workout Plan Session

If a workout contains several exercises, PoseFit may guide the user through the selected exercises sequentially.

Example:

**Monday Workout**

1. Squat
2. Push Up
3. Leg Raise

After completing Squat:

> Squat Complete  
> Next Exercise: Push Up

The user may continue to the next exercise or end the workout.

---

# 31. Workout History Page

The History Page stores previously completed exercise sessions.

Users should be able to view their workout activity over time.

## History Information

Each workout entry should display:

- Exercise
- Date
- Duration
- Sets
- Repetitions
- Accuracy
- Session Status

Example:

| Date | Exercise | Sets | Reps | Accuracy | Duration |
| --- | --- | ---: | ---: | ---: | ---: |
| Aug 20 | Push Up | 3 | 30 | 90% | 14 min |
| Aug 19 | Squat | 4 | 40 | 92% | 18 min |
| Aug 18 | Leg Raise | 3 | 30 | 88% | 10 min |

---

# 32. History Filters

Users may filter records according to:

- Exercise
- Date
- Week
- Month
- Accuracy

Example:

**Exercise: Leg Raise**

This displays only previous Leg Raise sessions.

---

# 33. View Session Details

Selecting a history entry should display the complete session analysis including:

- Accuracy Report
- Sets
- Repetitions
- Duration
- Detected Errors
- Gemini Feedback
- Comparison with Previous Session

---

# 34. Progress Tracking

PoseFit should use workout history to generate long term progress information.

Possible metrics include:

- Weekly average accuracy
- Monthly average accuracy
- Total exercise duration
- Total completed workouts
- Total repetitions
- Accuracy improvement
- Workout consistency

---

# 35. Responsive Web Design

PoseFit must use a responsive interface.

The web application should automatically adjust according to the user's device and screen size.

## Desktop and Laptop

The interface may use:

- Top Navigation Bar
- Large Dashboard Cards
- Multi Column Graphs
- Large Camera Area
- Side Exercise Information Panel

## Tablet

The interface should reduce the number of columns while preserving important information.

Example:

Two column dashboard layout.

## Mobile

The interface should use:

- Single Column Layout
- Mobile Navigation Menu
- Large Touch Friendly Buttons
- Responsive Cards
- Full Width Camera
- Simplified Camera Controls

During an exercise, essential information should remain visible without blocking the camera.

Essential information includes:

- Repetitions
- Current Set
- Timer
- Corrective Feedback
- End Session

---

# 36. Camera Responsiveness

The camera component should dynamically adjust its size according to the screen.

The user's body should remain clearly visible without stretching or distorting the video.

Pose overlays must remain correctly positioned when the camera container changes size.

Special consideration should be given to Leg Raise because the user performs the exercise while lying horizontally.

The camera layout should therefore ensure that the full body remains visible on both desktop and mobile devices.

---

# 37. Suggested Major Frontend Components

```text
Navbar
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
```

---

# 38. Proposed Backend Responsibilities

The Django backend should primarily handle:

- User Authentication
- User Profile Management
- Workout Plan Management
- Workout Session Storage
- Progress Tracking
- Workout History
- Accuracy Report Storage
- Session Comparison
- Gemini API Communication

MediaPipe pose detection may primarily operate through the frontend so that real time webcam processing can happen directly on the user's device.

---

# 39. System Responsibility Separation

PoseFit should clearly separate three responsibilities.

## MediaPipe

Responsible for:

- Detecting body landmarks
- Tracking body position

## PoseFit Biomechanical Logic

Responsible for:

- Calculating joint angles
- Detecting movement stages
- Counting repetitions
- Determining valid exercise form
- Detecting posture errors
- Calculating accuracy

## Gemini API

Responsible for:

- Transforming completed exercise results into understandable feedback
- Summarizing performance
- Explaining common mistakes
- Highlighting improvements

Gemini should not replace the angle based biomechanical evaluation system.

---

# 40. Exercise Detection Summary

| Exercise | Primary Measurement | General Target |
| --- | --- | --- |
| Squat | Hip → Knee → Ankle | Approximately 80° to 100° knee angle |
| Push Up | Shoulder → Elbow → Wrist | Below 90° bottom, above 150° top |
| Push Up Alignment | Shoulder → Hip → Ankle | Approximately 160° to 180° |
| Plank | Shoulder → Hip → Ankle | Approximately 170° to 210° |
| Forward Lunge | Hip → Knee → Ankle | Approximately 90° front knee flexion |
| Leg Raise | Hip Flexion | 30° to 60°, with approximately 60° as target raised position |
| Leg Raise Knee | Hip → Knee → Ankle | Leg should remain extended |

These thresholds should serve as the initial biomechanical basis of the implementation and should be verified during system testing before final deployment.

---

# 41. Core System Requirements

The completed PoseFit system should provide:

- User registration
- Secure login
- Responsive dashboard
- Login streak tracking
- Seven day exercise duration graph
- User progress reports
- Five supported exercises
- Squat
- Push Up
- Plank
- Forward Lunge
- Leg Raise
- Exercise configuration
- Repetition configuration
- Set configuration
- Rest configuration
- Webcam based pose detection
- Real time skeletal tracking
- Joint angle calculation
- Exercise form classification
- Real time corrective feedback
- Automatic repetition counting
- Automatic set tracking
- Rest timer
- Plank timer
- Exercise session timer
- Manual End Session function
- Exercise accuracy report
- Session summary
- Previous session comparison
- Gemini generated feedback
- Weekly workout planning
- Upcoming workout planning
- Workout history
- Detailed historical session reports
- Responsive desktop interface
- Responsive tablet interface
- Responsive mobile interface

---

# 42. Development Priority

To make implementation manageable, development should be completed in phases.

## Phase 1: Core User System

Implement:

- Signup
- Login
- Authentication
- User Profile
- Basic Dashboard

## Phase 2: Exercise Interface

Implement:

- Exercise Selection
- Exercise Setup
- Repetitions
- Sets
- Rest Timer
- Camera Page

## Phase 3: Computer Vision

Implement:

- MediaPipe Pose
- Landmark Detection
- Skeleton Overlay
- Joint Angle Calculation

## Phase 4: Exercise Logic

Implement exercises individually:

1. Squat
2. Push Up
3. Plank
4. Forward Lunge
5. Leg Raise

For each exercise, complete:

- Movement state detection
- Correct posture rules
- Incorrect posture rules
- Repetition counting or hold tracking
- Corrective feedback

For Leg Raise specifically:

- Hip flexion detection
- Leg raise movement state
- Target angle detection
- Knee extension monitoring
- Repetition counting
- Corrective feedback

## Phase 5: Exercise Session Management

Implement:

- Set Counter
- Rep Counter
- Timer
- Rest Timer
- Pause handling if required
- End Session
- Session Saving

## Phase 6: Accuracy and Reporting

Implement:

- Accuracy Calculation
- Accuracy Report
- Session Summary
- Previous Session Comparison

## Phase 7: Gemini Integration

Implement:

- Session Data Preparation
- Gemini API Request
- Generated Feedback
- Error Handling if Gemini is unavailable

The PoseFit result page should still function if the Gemini API fails.

## Phase 8: Workout Planning

Implement:

- Weekly Calendar
- Add Workout
- Edit Workout
- Delete Workout
- Upcoming Weeks
- Start Planned Workout

## Phase 9: History and Progress

Implement:

- Workout History
- Session Details
- Weekly Progress
- Seven Day Exercise Graph
- Accuracy Trends
- Dashboard Statistics

## Phase 10: Responsive Design and Optimization

Test and improve PoseFit on:

- Desktop
- Laptop
- Tablet
- Mobile

Verify:

- Camera scaling
- Pose overlay scaling
- Touch controls
- Navigation
- Dashboard charts
- Exercise cards
- Session results
- Horizontal body positioning for Leg Raise

---

# 43. Expected Final User Experience

A completed PoseFit experience should feel simple to the user.

The user should be able to:

**Open PoseFit → Login → See Progress → Choose Exercise → Configure Workout → Position Camera → Perform Exercise → Receive Real Time Feedback → Complete Sets → View Accuracy → Receive Personalized Feedback → Compare Progress → Review History → Plan the Next Workout**

The computer vision, biomechanical calculations, database operations, and AI processing should operate behind the interface without requiring users to understand the technical implementation.

---

# 44. Scientific Basis

The biomechanical rules used in PoseFit are supported by the studies included in the project's Review of Related Literature.

- Wijayanti et al. (2024) for squat biomechanics and joint positioning.
- Kumaresan and Asmawi (2026) for squat knee angle classification.
- Park et al. (2020) for Push Up elbow angle, body alignment, wrist shoulder distance, and symmetry.
- Kowalski et al. (2021) for Push Up joint position and muscle activation.
- García Jaén et al. (2023) for Plank body alignment and core muscle activation.
- Kagdi and Van Der Haar (2025) for Plank shoulder hip ankle angle classification.
- Mohamed Sabadri et al. (2023) for knee angles during Forward Lunges.
- Goulette et al. (2021) for Forward Lunge knee flexion biomechanics.
- Shin et al. (2026) for approximately 90° knee flexion and upright trunk positioning during Forward Lunges.
- Juan et al. (2024) for hip flexor activation during Straight Leg Raise and Leg Lift exercises, supporting the use of hip flexion angle as a measurable indicator for Leg Raise evaluation.

For the Leg Raise, Juan et al. (2024) found greater iliopsoas activation between **30° and 60° of hip flexion** compared with the **0° to 30° range**, with substantial activation occurring at approximately **60°**. These findings provide a scientific basis for PoseFit to monitor the raising phase using hip flexion angle while also checking that the leg remains extended throughout the movement.

These biomechanical findings provide the scientific foundation for PoseFit's angle based exercise evaluation system.