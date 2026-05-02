import { ResetPasswordForm } from "@/components/ui/reset-password-form";

type ResetPasswordPageProps = {
  searchParams?: Promise<{
    token?: string;
  }>;
};

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const params = await searchParams;

  return <ResetPasswordForm token={params?.token || ""} />;
}
