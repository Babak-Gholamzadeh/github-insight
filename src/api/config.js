const BASE_URL = 'https://api.github.com';

const APIs = {
  GET_REPOSITORIES({organization, token}) {
    return {
      baseURL: BASE_URL,
      method: 'GET',
      url: `/orgs/${organization}/repos?per_page=100&page=1`,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  },
};

export default APIs;
