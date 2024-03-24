import './Checkbox.style.scss';

const Checkbox = ({ children, className, ...rest }) => {
  return (
    <div className={'checkbox-wrapper' + (className ? ` ${className}` : '')}>
      <label>
        <input type='checkbox' {...rest} />
        {children}
      </label>
    </div>
  );
};

export default Checkbox;
