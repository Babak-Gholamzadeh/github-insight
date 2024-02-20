import './SubmitButton.style.scss';

const SubmitButton = ({ children }) => {
  return (
    <button className='submit-button' type='submit'>
      {children}
    </button>
  );
};

export default SubmitButton;
