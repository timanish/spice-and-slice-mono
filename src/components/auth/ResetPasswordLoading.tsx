
interface ResetPasswordLoadingProps {
  message?: string;
}

export const ResetPasswordLoading = ({ message = "Verifying reset link..." }: ResetPasswordLoadingProps) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">{message}</p>
        </div>
      </div>
    </div>
  );
};
