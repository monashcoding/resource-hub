import { Link } from 'react-router-dom';
import { login, signOut, type Provider } from '../auth.js';

/** Shown on /admin when nobody is signed in. Public browsing never sees this. */
export function SignIn({ message }: { message?: string }): JSX.Element {
  const start = (provider: Provider): void => {
    void login(provider, window.location.href);
  };

  return (
    <div className="shell">
      <div className="centered">
        <h1>Committee sign-in</h1>
        <p className="muted">{message ?? 'Sign in with your Monash account to manage resources.'}</p>
        <button className="btn btn--primary" onClick={() => start('microsoft')}>
          Sign in with Microsoft
        </button>
        <button className="btn" onClick={() => start('google')}>
          Sign in with Google
        </button>
        <p className="small">
          <Link className="textlink" to="/">
            Back to the map
          </Link>
        </p>
      </div>
    </div>
  );
}

/** Shown when a signed-in user is not on the committee roster. */
export function NotCommittee({ email }: { email?: string }): JSX.Element {
  return (
    <div className="shell">
      <div className="centered">
        <h1>Committee access required</h1>
        <p className="muted">
          {email ? <>You’re signed in as {email}, which</> : 'This account'} isn’t on the MAC committee
          roster. Roles come from the central roster — ask an exec to add you rather than changing
          anything here.
        </p>
        <button
          className="btn"
          onClick={() => {
            void signOut().then(() => window.location.reload());
          }}
        >
          Sign out
        </button>
        <p className="small">
          <Link className="textlink" to="/">
            Back to the map
          </Link>
        </p>
      </div>
    </div>
  );
}
