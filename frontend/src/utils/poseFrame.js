export async function sendPoseFrameSafely({ pose, video, isActive, onActiveError }) {
  if (!pose || !video || !isActive()) return false;
  if (Number.isFinite(video.readyState) && video.readyState < 2) return false;

  try {
    await pose.send({ image: video });
    return true;
  } catch (error) {
    // MediaPipe may reject its final in-flight frame while the page is unmounting.
    // That is an expected teardown condition and must not reach the runtime overlay.
    if (isActive()) onActiveError?.(error);
    return false;
  }
}
