import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import StartPlanDialog, { earliestMonday } from './StartPlanDialog';
import { localDateKey } from '../../pages/workout-plans/details/beginnerActivePlan';

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
});
test.each([
  ['2026-09-13T16:01:00Z', '2026-09-14'],
  ['2026-09-15T12:00:00Z', '2026-09-21'],
  ['2026-09-20T12:00:00Z', '2026-09-21'],
])('defaults to the nearest valid Manila Monday for %s', (now, expected) => {
  expect(localDateKey(earliestMonday(new Date(now)))).toBe(expected);
});
test('later Mondays update the preview and are submitted without resetting', () => {
  const confirm = jest.fn();
  render(<StartPlanDialog onConfirm={confirm} onCancel={jest.fn()} />);
  expect(screen.getByRole('button', { name: 'Earlier Monday' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Later Monday' }));
  const selected = document.querySelector('.start-plan-dialog__selector time').dateTime;
  const preview = [...document.querySelectorAll('.start-plan-dialog__preview time')].map((item) => item.dateTime);
  expect(preview[0]).toBe(selected);
  expect(preview.map((value) => new Date(`${value}T12:00:00`).getDay())).toEqual([1, 3, 5]);
  fireEvent.click(screen.getByText('Your first week'));
  fireEvent.click(screen.getByRole('button', { name: 'Start Plan' }));
  expect(confirm).toHaveBeenCalledWith(selected);
});
