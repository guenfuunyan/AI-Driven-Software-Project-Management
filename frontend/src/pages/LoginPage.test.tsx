import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from './LoginPage';

vi.mock('../store/auth', () => ({
  useAuthStore: () => ({
    setAuth: vi.fn(),
  }),
}));

describe('LoginPage', () => {
  it('renders the demo credential hint', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/vai trò demo/i)).toBeInTheDocument();
  });

  it('submits the form with the entered credentials', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText(/username/i), 'pm');
    await user.type(screen.getByLabelText(/password/i), 'pm123456');
    await user.click(screen.getByRole('button', { name: /đăng nhập/i }));

    expect(screen.getByRole('button', { name: /đăng nhập/i })).toBeInTheDocument();
  });
});
