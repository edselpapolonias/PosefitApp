import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import SquatPage from '../pages/exercises/configuration/SquatPage';
import PushUpPage from '../pages/exercises/configuration/PushUpPage';
import PlankPage from '../pages/exercises/configuration/PlankPage';
import LungePage from '../pages/exercises/configuration/LungePage';
import LegRaisePage from '../pages/exercises/configuration/LegRaisePage';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }), { virtual: true });
jest.mock('./Navbar', () => () => <nav>Exercises</nav>);

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
  jest.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
  jest.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
});
beforeEach(() => { jest.clearAllMocks(); document.body.style.overflow = ''; });
afterAll(() => jest.restoreAllMocks());

test.each([
  ['Squat', SquatPage, 'Squat.mp4'],
  ['Push-up', PushUpPage, 'Pushup.mp4'],
  ['Plank', PlankPage, 'Plank.mp4'],
  ['Lunge', LungePage, 'Lunge.mp4'],
  ['Leg Raise', LegRaisePage, 'Leg%20Raise.mp4'],
])('%s opens the correct silent video and preserves workout configuration', (name, Page, filename) => {
  render(<Page />);
  expect(document.querySelector('video')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: /Custom/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Increase Sets' }));
  fireEvent.click(screen.getByRole('button', { name: `Increase ${name === 'Plank' ? 'Hold Time' : 'Reps per Set'}` }));
  const before = [...document.querySelectorAll('output')].map((output) => output.textContent);
  const trigger = screen.getByRole('button', { name: 'Watch Demonstration' });
  trigger.focus();
  fireEvent.click(trigger);
  expect(screen.getByRole('dialog', { name: `How to Perform: ${name}` })).toBeInTheDocument();
  const video = screen.getByLabelText(`${name} demonstration video`);
  expect(video).toHaveAttribute('src', `/videos/how-to-perform/${filename}`);
  expect(video.muted).toBe(true);
  expect(video.volume).toBe(0);
  expect(video).toHaveAttribute('loop');
  expect(video).toHaveAttribute('autoplay');
  expect(video).toHaveAttribute('playsinline');
  expect(video).not.toHaveAttribute('controls');
  expect(document.body.style.overflow).toBe('hidden');
  video.currentTime = 5;
  fireEvent.click(screen.getByRole('button', { name: 'Close demonstration video' }));
  expect(video.pause).toHaveBeenCalled();
  expect(video.currentTime).toBe(0);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(document.body.style.overflow).toBe('');
  expect(document.activeElement).toBe(trigger);
  expect([...document.querySelectorAll('output')].map((output) => output.textContent)).toEqual(before);
  expect(mockNavigate).not.toHaveBeenCalled();
});

test('backdrop and Escape close; content clicks do not; original scroll style is restored', () => {
  document.body.style.overflow = 'auto';
  render(<SquatPage />);
  const open = () => fireEvent.click(screen.getByRole('button', { name: 'Watch Demonstration' }));
  open();
  fireEvent.click(screen.getByRole('heading', { name: 'How to Perform: Squat' }));
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('dialog'));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(document.body.style.overflow).toBe('auto');
  open();
  fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('unmount stops playback and errors keep the close action available', () => {
  const { unmount } = render(<PlankPage />);
  fireEvent.click(screen.getByRole('button', { name: 'Watch Demonstration' }));
  const video = screen.getByLabelText('Plank demonstration video');
  fireEvent.error(video);
  expect(screen.getByRole('alert')).toHaveTextContent('Unable to load the demonstration video.');
  expect(screen.getByRole('button', { name: 'Close demonstration video' })).toBeEnabled();
  unmount();
  expect(video.pause).toHaveBeenCalled();
  expect(document.body.style.overflow).toBe('');
});
