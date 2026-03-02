
import { ResetPasswordLoading } from '@/components/auth/ResetPasswordLoading';
import { ResetPasswordError } from '@/components/auth/ResetPasswordError';
import { ResetPasswordFormFields } from '@/components/auth/ResetPasswordFormFields';
import { useResetPasswordLogic } from '@/hooks/useResetPasswordLogic';

const ResetPasswordPage = () => {
  const {
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    loading,
    errorMsg,
    isValidResetLink,
    isInitializing,
    handleResetPassword,
    handleBackToAuth
  } = useResetPasswordLogic();

  if (isInitializing) {
    return <ResetPasswordLoading />;
  }

  if (errorMsg && !isValidResetLink) {
    return <ResetPasswordError message={errorMsg} />;
  }

  return (
    <ResetPasswordFormFields
      password={password}
      confirmPassword={confirmPassword}
      errorMsg={errorMsg}
      loading={loading}
      onPasswordChange={setPassword}
      onConfirmPasswordChange={setConfirmPassword}
      onSubmit={handleResetPassword}
      onBackToAuth={handleBackToAuth}
    />
  );
};

export default ResetPasswordPage;
