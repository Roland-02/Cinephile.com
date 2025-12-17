import React from 'react';

const REPO_URL = 'https://github.com/Roland-02/Cinephile.com';

const About = () => {
  return (
    <div className="container page-container" style={{ paddingBottom: '90px' }}>
      <div className="row justify-content-center">
        <div className="col-12 col-lg-9">
          <div className="text-center mb-4">
            <p className="mb-0">
              Cinephile.com is a film discovery and recommendation app that helps you find movies that match your taste.
            </p>
          </div>

          <div className="mb-4">
            <h4 className="mb-2">What this project does</h4>
            <ul className="mb-0">
              <li>Lets you discover films one poster at a time and quickly move through results.</li>
              <li>Supports searching and building a watchlist.</li>
              <li>Generates personalized recommendations based on your interactions.</li>
            </ul>
          </div>

          <div className="mb-4">
            <h4 className="mb-2">Why it exists</h4>
            <p className="mb-0">
              The goal is to make movie exploration feel lightweight and personal, and to surface recommendations based on what you actually respond to.
            </p>
          </div>

          <div className="mb-4">
            <h4 className="mb-2">Key technical achievements</h4>
            <ul className="mb-0">
              <li>Two-part architecture: a React client plus a Python recommendation service.</li>
              <li>Fast navigation and caching to keep browsing responsive.</li>
              <li>Theme support with consistent Light and Dark mode styling.</li>
            </ul>
          </div>

          <div className="mb-4">
            <h4 className="mb-2">How to use the app</h4>
            <ol className="mb-0">
              <li>Sign in to enable saving and personalization features.</li>
              <li>Browse on Home and use filters to narrow down results.</li>
              <li>Use the previous/next navigation around the poster to move through films.</li>
              <li>Add films to your watchlist and use Search to find specific titles.</li>
              <li>Visit Recommend to get suggestions based on your activity.</li>
            </ol>
          </div>

          <div>
            <h4 className="mb-2">Source code</h4>
            <p className="mb-2">The project repository is available on GitHub.</p>
            <a className="btn btn-secondary" href={REPO_URL} target="_blank" rel="noreferrer">
              View on GitHub
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
