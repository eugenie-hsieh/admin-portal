import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useActionData, useLoaderData, useSubmit } from "@remix-run/react";
import type { SelectGroup } from "@shopify/polaris";
import {
  Box,
  Card,
  Layout,
  Page,
  Button,
  Text,
  FormLayout,
  TextField,
  BlockStack,
  ButtonGroup,
  Select,
} from "@shopify/polaris";
import { useCallback, useEffect, useMemo, useState } from "react";
import { authenticate } from "~/shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const response = await admin.graphql(
    `query DeliveryCustomizations {
        deliveryCustomizations(first: 50) {
            nodes {
                enabled
                id
                title
            }
        }
    }`,
    {},
  );
  const responseJson = await response.json();
  const existingDeliveryCustomizations =
    responseJson.data.deliveryCustomizations.nodes;
  return (
    (existingDeliveryCustomizations && {
      body: existingDeliveryCustomizations,
    }) ||
    null
  );
};

export const action = async ({ request }: ActionFunctionArgs) => {
  //   TODO: add loading state
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const selectedCustomization = formData.get("selectedCustomization");
  const message = formData.get("message");

  const setMetafieldsResponse = await admin.graphql(
    `#graphql
      mutation {
        metafieldsSet(metafields: [
          {
            ownerId: "${selectedCustomization}"
            namespace: "delivery-customization"
            key: "function-configuration"
            value: "{ \\"stateProvinceCode\\": \\"NSW\\", \\"message\\": \\"${message}\\" }"
            type: "json"
          }
        ]) {
          metafields {
            id
          }
          userErrors {
            message
          }
        }
      }`,
    {},
  );

  const setMetafieldsResponseJson = await setMetafieldsResponse.json();
  return json({
    body: setMetafieldsResponseJson.data,
  });
};

export default function AddDeliveryCustomization() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  const [message, setMessage] = useState("");
  const [selectedCustomization, setSelectedCustomization] = useState(
    loaderData?.body[0].id,
  );
  const [allCustomizations, setAllCustomizations] = useState<SelectGroup[]>([]);
  const handleSelectChange = useCallback(
    (value: string) => setSelectedCustomization(value),
    [],
  );
  const updateMessage = useCallback((value: string) => {
    setMessage(value);
  }, []);
  const submit = useSubmit();
  const modifyDeliveryMessage = () => {
    submit({ message, selectedCustomization }, { method: "POST" });
  };

  useEffect(() => {
    const customizations = loaderData?.body
      ?.filter((c: any) => c.enabled)
      ?.map(
        // TODO: type below properly
        (customization: any) => {
          return {
            value: customization.id,
            label: customization.title,
          };
        },
      );
    setAllCustomizations(customizations);
    setMessage("");
  }, [loaderData]);

  const modifyDeliveryMessageResponse = useMemo(() => {
    const error = actionData?.body?.metafieldsSet?.userErrors[0]?.message;
    const success =
      actionData?.body?.metafieldsSet?.metafields &&
      "Successfully modified delivery message";
    return (
      <Text variant="bodyMd" as="h4" tone={error ? "critical" : "success"}>
        {error || success}
      </Text>
    );
  }, [actionData]);

  return (
    <Page>
      <ui-title-bar title="Customize cart here" />
      <Layout>
        <UserPreferences>
          <Layout.Section>
            <FormLayout>
              <Card>
                <Text fontWeight="bold" variant="bodyLg" as="h2">
                  Step 1: Pick a delivery customization function to make the
                  change with
                </Text>
                <Select
                  label="Delivery customization"
                  options={allCustomizations}
                  onChange={handleSelectChange}
                  value={selectedCustomization}
                />
              </Card>
              <Card>
                <BlockStack gap="400">
                  <BlockStack gap="100">
                    <Text variant="bodyMd" fontWeight="bold" as="h2">
                      2. Modify the cart below
                    </Text>
                    <Text variant="bodyMd" as="h4">
                      There would ideally be more modifications to be made
                    </Text>
                  </BlockStack>
                  <TextField
                    label="New delivery option message: "
                    autoComplete="off"
                    value={message}
                    onChange={updateMessage}
                  />
                  <ButtonGroup>
                    <Button onClick={modifyDeliveryMessage} variant="primary">
                      Modify delivery message
                    </Button>
                  </ButtonGroup>
                  {modifyDeliveryMessageResponse}
                </BlockStack>
              </Card>
            </FormLayout>
          </Layout.Section>
        </UserPreferences>
      </Layout>
    </Page>
  );
}

function UserPreferences({ children }: { children: React.ReactNode }) {
  return (
    <Box as="span" width="100%">
      <span>{children}</span>
    </Box>
  );
}
