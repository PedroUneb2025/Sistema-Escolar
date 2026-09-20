import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';

configure({ asyncUtilTimeout: 4000 });

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
});

afterEach(() => cleanup());
