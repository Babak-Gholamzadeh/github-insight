import './SubmitButton.style.scss';

const SubmitButton = ({ children, disabled, status }) => {
  return (
    <button className={
      'submit-button' +
      (disabled ? ' disabled' : '') +
      ` ${status}`
    } type='submit'>
      {children}
    </button>
  );
};

export default SubmitButton;
