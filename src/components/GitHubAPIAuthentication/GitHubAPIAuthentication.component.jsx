import { useState } from 'react';
import TextInput from '../TextInput/TextInput.component';
import SubmitButton from '../SubmitButton/SubmitButton.component';

import './GitHubAPIAuthentication.style.scss';

const GitHubAPIAuthentication = ({ onApply }) => {
  const [state, setState] = useState({
    organization: '',
    token: '',
  });

  const onChange = (e) => {
    const { value, name } = e.target;
    setState({
      ...state,
      [name]: value,
    });
  };

  const onSubmit = e => {
    e.preventDefault();
    onApply(state);
  };

  return (
    <div className="api-auth">
      <h3 className='section-title'>Authentication</h3>
      <form onSubmit={onSubmit} className='auth-container'>
        <div className='auth-element auth-org'>
          <label>Organization</label>
          <TextInput
            id="organization"
            name="organization"
            placeholder="Enter the organization name"
            value={state.organization}
            onChange={onChange}
          />
          <div className='note'>
            Enter the name that is used in the GitHub URL of the organization.
          </div>
        </div>
        <div className='auth-element auth-token'>
          <label>Access Token</label>
          <TextInput
            id="token"
            name="token"
            type="password"
            placeholder="Enter your access token"
            value={state.token}
            onChange={onChange}
          />
          <div className='note'>
            Check out this links to get to know how to generate access token for GitHub APIs:
            <a href="https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens">Managing your personal access tokens</a>
            <a href="https://docs.github.com/en/enterprise-cloud@latest/authentication/authenticating-with-saml-single-sign-on">Authenticating with SAML single sign-on</a>
          </div>
        </div>
        <SubmitButton>Apply</SubmitButton>
      </form>
    </div>
  );
};

export default GitHubAPIAuthentication;
