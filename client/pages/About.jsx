import React from 'react';

const REPO_URL = 'https://github.com/Roland-02/Cinephile.com';

const About = () => {
  return (
    <div className="container page-container about-page" style={{ paddingTop: '100px', paddingBottom: '90px' }}>
      <div className="row justify-content-center">
        <div className="col-12 col-lg-9">
          <div className="text-center mb-4">
            <blockquote className="cinephile-definition mb-0">
              <p className="mb-2">“a person who is fond of movies”</p>
              <footer className="cinephile-definition-source">Oxford Languages</footer>
            </blockquote>
          </div>

          <div className="about-section mb-4">
            <h4 className="mb-2">Why I built this</h4>
            <p className="mb-2">
              I built <strong>Cinephile.com</strong> because <strong> I love films</strong>, and I wanted to build something
              that helps people discover them in a more <strong>meaningful way</strong>.
            </p>
            <p className="mb-0">
              I’ve always been frustrated by traditional recommendation platforms that reduce your taste to a simple
              <strong> thumbs-up/down</strong> or a <strong>star rating</strong>. Cinephile is my attempt to make discovery
              feel more intentional.
              It’s a <strong>film exploration platform</strong>, not just a recommender system.
            </p>
          </div>

          <div className="about-section mb-4">
            <h4 className="mb-2">What the app does</h4>
            <ul className="mb-3">
              <li>Users browse films <strong>one at a time</strong>.</li>
              <li>Users can <strong>like or dislike</strong> specific features of a film (cast, crew, genre, plot, and more).</li>
              <li>The app learns from those interactions and <strong>adapts to your taste</strong>.</li>
            </ul>
            <p className="mb-2">The app provides:</p>
            <ul className="mb-3">
              <li><strong>Personalised recommendations</strong></li>
              <li><strong>Category-based recommendations</strong> (cast, genre, plot, crew)</li>
              <li><strong>Search</strong></li>
              <li><strong>Watchlist</strong></li>
              <li><strong>Profile analytics</strong></li>
            </ul>

            <h5 className="mb-2">How to use it</h5>
            <ul className="mb-0">
              <li><strong>Sign in</strong> to unlock <strong>personalisation</strong>.</li>
              <li><strong>Browse films</strong> and react to what you <strong>like</strong> or <strong>dislike</strong>.</li>
              <li>Get <strong>tailored recommendations</strong> across <strong>multiple categories</strong>.</li>
              <li><strong>Search</strong> for titles or <strong>save</strong> them to your <strong>watchlist</strong>.</li>
              <li>Explore your viewing <strong>preferences</strong> in your <strong>profile</strong>.</li>
            </ul>
          </div>

          <div className="about-section mb-4">
            <h4 className="mb-2">Machine Learning</h4>
            <p className="mb-2">
              The goal is simple: <strong>accurate recommendations without trapping users in a filter bubble</strong>.
            </p>
            <ul className="mb-0">
              <li>This is a <strong>content-based</strong> recommendation system.</li>
              <li>It uses <strong>unsupervised learning</strong>.</li>
              <li>User profiles are built from <strong>implicit feedback</strong> (what you interact with).</li>
              <li>Film features are <strong>segmented</strong> (plot, cast, crew, genres, metadata).</li>
              <li><strong>Multiple similarity models</strong> are combined to improve accuracy and reduce recommendation homogeneity.</li>
            </ul>
          </div>

          <div className="about-section mb-4">
            <h4 className="mb-2">Technical Overview</h4>
            <div className="about-tech-grid">
              <div className="about-tech-card">
                <div className="about-tech-title">Frontend</div>
                <ul className="about-tech-list">
                  <li><strong>React JS</strong> (built with <strong>Vite</strong>)</li>
                  <li><strong>SASS/SCSS</strong> for styling and theming</li>
                  <li><strong>Axios</strong> for API requests</li>
                </ul>
              </div>

              <div className="about-tech-card">
                <div className="about-tech-title">Backend</div>
                <ul className="about-tech-list">
                  <li><strong>Python Flask</strong> web server</li>
                  <li><strong>Python</strong> Recommendation Engine</li>
                  <li><strong>MySQL</strong> for storage</li>
                </ul>
              </div>

              <div className="about-tech-card">
                <div className="about-tech-title">Machine Learning</div>
                <ul className="about-tech-list">
                  <li><strong>TF-IDF</strong> with <strong>cosine similarity</strong></li>
                  <li><strong>Euclidean distance</strong> for numerical features</li>
                  <li><strong>K-Means clustering </strong> for genre diversity</li>
                  <li><strong>Ensemble/ weighted averaging</strong> of similarity scores</li>
                </ul>
              </div>

              <div className="about-tech-card">
                <div className="about-tech-title">Data Sources</div>
                <ul className="about-tech-list">
                  <li><strong>IMDb</strong> (core metadata)</li>
                  <li><strong>TMDB</strong> (plot summaries and posters)</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="about-section about-section--cta text-center">
            <h4 className="mb-2">GitHub Repository</h4>
            <p className="mb-2">If you’d like to explore the code, feel free to take a look:</p>
            <a className="btn btn-secondary about-github-btn" href={REPO_URL} target="_blank" rel="noreferrer">
              View on GitHub
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
