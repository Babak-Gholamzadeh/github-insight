import { useEffect, useState } from 'react';
import TextInput from '../TextInput/TextInput.component';
import SubmitButton from '../SubmitButton/SubmitButton.component';
import Checkbox from '../Checkbox/Checkbox.component';
import axios from 'axios';

import './GitHubAPIAuthentication.style.scss';

const INPUT_STATUS = {
  NEUTRAL: 'neutral',
  SUCCESS: 'success',
  ERROR: 'error',
};

const GitHubAPIAuthentication = ({ auth, setAuth }) => {
  const [owner, setOwner] = useState('');
  const [ownerInputStatus, setOwnerInputStatus] = useState({
    status: INPUT_STATUS.NEUTRAL,
    message: 'Owner',
  });
  const [ownerType, setOwnerType] = useState('');
  const [token, setToken] = useState('');
  const [tokenInputStatus, setTokenInputStatus] = useState({
    status: INPUT_STATUS.NEUTRAL,
    message: 'Access Token',
  });
  const [saveInfo, setSaveInfo] = useState(true);
  const [checking, setChecking] = useState(false);
  const [submit, setSubmit] = useState({});

  useEffect(() => {
    const owner = window.localStorage.getItem('owner');
    const ownerType = window.localStorage.getItem('ownerType');
    const token = window.localStorage.getItem('token');
    setOwner(owner);
    setOwnerType(ownerType);
    setToken(token);
  }, []);

  const onOwnerChange = e => {
    const { value } = e.target;
    setOwnerInputStatus({
      status: INPUT_STATUS.NEUTRAL,
      message: 'Owner',
    });
    setOwner(value);
  };

  const onTokenChange = e => {
    const { value } = e.target;
    setTokenInputStatus({
      status: INPUT_STATUS.NEUTRAL,
      message: 'Access Token',
    });
    setToken(value);
  };

  const onSubmit = async e => {
    e.preventDefault();

    setChecking(true);

    const [ownerResponse, tokenResponse] = await Promise.allSettled([
      axios.get(`https://api.github.com/users/${owner}`),
      axios.get(`https://api.github.com/user/repos`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }),
    ]);

    await new Promise(res => setTimeout(res, 1000));


    console.log('ownerResponse.status:', ownerResponse.status);
    console.log('tokenResponse:', tokenResponse.status);

    if (ownerResponse.status === 'rejected') {
      const statusCode = ownerResponse.reason.response?.status || 500;
      let errorMessage = '';
      switch (statusCode) {
        case 404:
          errorMessage = 'This owner does not exist';
          break;
        default:
          errorMessage = 'There is an unexpected error. There might be some internet connection issue!';
      }
      setOwnerInputStatus({
        status: INPUT_STATUS.ERROR,
        message: errorMessage,
      });
    } else {
      setOwnerType(ownerResponse.value.data.type.toLowerCase());
      setOwnerInputStatus({
        status: INPUT_STATUS.SUCCESS,
        message: `${ownerResponse.value.data.name} (${ownerResponse.value.data.type})`,
      });
    }

    if (tokenResponse.status === 'rejected') {
      const statusCode = tokenResponse.reason.response?.status || 500;
      let errorMessage = '';
      switch (statusCode) {
        case 401:
          errorMessage = 'This token is invalid';
          break;
        default:
          errorMessage = 'There is an unexpected error. There might be some internet connection issue!';
      }
      setTokenInputStatus({
        status: INPUT_STATUS.ERROR,
        message: errorMessage,
      });
    } else {
      setTokenInputStatus({
        status: INPUT_STATUS.SUCCESS,
        // @FIXME: Expiration time is undefined
        message: `Token is valid until ${tokenResponse.value.headers.get('github-authentication-token-expiration')}`,
      });
    }


    setChecking(false);
    setSubmit({
      owner,
      ownerType,
      token,
    });
  };

  useEffect(() => {
    if (ownerInputStatus.status !== INPUT_STATUS.SUCCESS || tokenInputStatus.status !== INPUT_STATUS.SUCCESS) {
      if (auth.owner || auth.ownerType || auth.token) {
        setAuth({});
      }
      return;
    }

    if (saveInfo) {
      window.localStorage.setItem('owner', owner);
      window.localStorage.setItem('ownerType', ownerType);
      window.localStorage.setItem('token', token);
    }

    setAuth(submit);

  }, [submit]);

  return (
    <div className="api-auth">
      <form onSubmit={onSubmit} className='auth-container'>
        <div className='auth-element auth-owner'>
          <label className={`message ${ownerInputStatus.status}`}>{ownerInputStatus.message}</label>
          <TextInput
            id="owner"
            name="owner"
            placeholder="Enter the owner name"
            value={owner}
            onChange={onOwnerChange}
            className={ownerInputStatus.status}
          />
          <div className='note'>
            Enter the name that is used in the GitHub URL of the owner (organization or user)
          </div>
        </div>
        <div className='auth-element auth-token'>
          <label className={`message ${tokenInputStatus.status}`}>{tokenInputStatus.message}</label>
          <TextInput
            id="token"
            name="token"
            type="password"
            placeholder="Enter your access token"
            value={token}
            onChange={onTokenChange}
            className={tokenInputStatus.status}
          />
          <div className='note'>
            Check out this links to see how to generate an access token for GitHub APIs:
            <a href="https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens">Managing your personal access tokens</a>
            <a href="https://docs.github.com/en/enterprise-cloud@latest/authentication/authenticating-with-saml-single-sign-on">Authenticating with SAML single sign-on</a>
          </div>
        </div>
        <Checkbox
          className='save-info'
          checked={saveInfo}
          onChange={() => setSaveInfo(!saveInfo)}>
          Save these info
        </Checkbox>
        <div className='note'>
          They can be saved in the local storage in your browser
        </div>
        <SubmitButton
          disabled={!owner || !token}
          status={
            (() => {
              if (checking)
                return 'checking';
              if (ownerInputStatus.status === INPUT_STATUS.ERROR || tokenInputStatus.status === INPUT_STATUS.ERROR)
                return INPUT_STATUS.ERROR;
              if (ownerInputStatus.status === INPUT_STATUS.SUCCESS && tokenInputStatus.status === INPUT_STATUS.SUCCESS)
                return INPUT_STATUS.SUCCESS;
              return INPUT_STATUS.NEUTRAL;
            })()
          }>
          {
            (() => {
              if (checking)
                return 'Checking...';
              return ownerInputStatus.status === INPUT_STATUS.SUCCESS && tokenInputStatus.status === INPUT_STATUS.SUCCESS
                ? 'Authorized'
                : 'Authorize';
            })()
          }
        </SubmitButton>
      </form >
    </div >
  );
};

export default GitHubAPIAuthentication;
