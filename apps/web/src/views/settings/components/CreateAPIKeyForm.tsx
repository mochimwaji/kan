import { t } from "@lingui/core/macro";

import { authClient } from "@kan/auth/client";

import Button from "~/components/Button";
import Input from "~/components/Input";

const CreateAPIKeyForm = ({
  apiKey,
  refetchUser,
}: {
  apiKey:
    | {
        id: number;
        prefix: string | null;
        key: string;
      }
    | null
    | undefined;
  refetchUser: () => void;
}) => {
  const handleCreateAPIKey = async () => {
    await authClient.apiKey.create({
      name: "Kan API Key",
      prefix: "kan_",
    });

    refetchUser();
  };

  const handleRevokeAPIKey = async () => {
    if (!apiKey) return;
    await authClient.apiKey.delete({
      keyId: apiKey.id.toString(),
    });

    refetchUser();
  };

  return (
    <div>
      {apiKey ? (
        <div className="flex gap-2">
          <div className="mb-4 flex w-full max-w-[325px] items-center gap-2">
            <Input value={apiKey.key} readOnly type="password" />
          </div>
          <div>
            <Button variant="danger" onClick={handleRevokeAPIKey}>
              {t`Revoke`}
            </Button>
          </div>
        </div>
      ) : (
        <Button onClick={handleCreateAPIKey}>{t`Create new key`}</Button>
      )}
    </div>
  );
};

export default CreateAPIKeyForm;
