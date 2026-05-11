import React from 'react';
import { SignIn, SignUp } from '@clerk/clerk-react';

const wrapperStyle = { paddingTop: '40px' };
const wrapperClass = 'container page-container d-flex justify-content-center';

export const Login = () => (
  <div className={wrapperClass} style={wrapperStyle}>
    <SignIn
      routing="path"
      path="/login"
      signUpUrl="/createAccount"
      afterSignInUrl="/"
      afterSignUpUrl="/"
    />
  </div>
);

export const CreateAccount = () => (
  <div className={wrapperClass} style={wrapperStyle}>
    <SignUp
      routing="path"
      path="/createAccount"
      signInUrl="/login"
      afterSignInUrl="/"
      afterSignUpUrl="/"
    />
  </div>
);
