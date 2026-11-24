import { sendPoseFrameSafely } from './poseFrame';

test('does not submit a frame after the video element has been removed', async () => {
  const pose = { send: jest.fn() };

  const sent = await sendPoseFrameSafely({
    pose,
    video: null,
    isActive: () => true,
  });

  expect(sent).toBe(false);
  expect(pose.send).not.toHaveBeenCalled();
});

test('suppresses an in-flight MediaPipe rejection when teardown has started', async () => {
  let active = true;
  const errorHandler = jest.fn();
  const video = { readyState: 4 };
  const pose = {
    send: jest.fn(async () => {
      active = false;
      throw new TypeError("Cannot read properties of null (reading 'width')");
    }),
  };

  const sent = await sendPoseFrameSafely({
    pose,
    video,
    isActive: () => active,
    onActiveError: errorHandler,
  });

  expect(sent).toBe(false);
  expect(errorHandler).not.toHaveBeenCalled();
});

test('reports a frame failure when the camera session is still active', async () => {
  const failure = new Error('model failure');
  const errorHandler = jest.fn();
  const pose = { send: jest.fn().mockRejectedValue(failure) };

  await sendPoseFrameSafely({
    pose,
    video: { readyState: 4 },
    isActive: () => true,
    onActiveError: errorHandler,
  });

  expect(errorHandler).toHaveBeenCalledWith(failure);
});

test('submits the stable video snapshot to MediaPipe', async () => {
  const video = { readyState: 4 };
  const pose = { send: jest.fn().mockResolvedValue() };

  const sent = await sendPoseFrameSafely({ pose, video, isActive: () => true });

  expect(sent).toBe(true);
  expect(pose.send).toHaveBeenCalledWith({ image: video });
});
