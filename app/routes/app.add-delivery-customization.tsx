import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useActionData, useLoaderData, useSubmit } from "@remix-run/react";
import {
  Box,
  Card,
  Layout,
  Page,
  Button,
  Text,
  FormLayout,
  ResourceItem,
  ResourceList,
  TextField,
  BlockStack,
  ButtonGroup,
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
  const fnName = formData.get("fnName");

  const setMetafieldsResponse = await admin.graphql(
    `mutation deliveryCustomizationCreates($deliveryCustomization: DeliveryCustomizationInput!) {
        deliveryCustomizationCreate(deliveryCustomization: $deliveryCustomization) {
          deliveryCustomization {
            id
          }
          userErrors {
            message
          }
        }
    }`,
    {
      variables: {
        deliveryCustomization: {
          enabled: true,
          functionId: process.env.SHOPIFY_DELIVERY_CUSTOMIZATION_ID,
          title: fnName,
        },
      },
    },
  );

  const setMetafieldsResponseJson = await setMetafieldsResponse.json();
  return json({
    body: setMetafieldsResponseJson.data,
  });
};

export default function AddDeliveryCustomization() {
  const [fnName, setFnName] = useState("");
  const updateFnName = useCallback((value: string) => {
    setFnName(value);
  }, []);
  const submit = useSubmit();
  const createNewDeliveryCustomization = () => {
    submit({ fnName }, { method: "POST" });
  };

  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  type DeliveryCustomization = {
    id: string;
    title: string;
    enabled: boolean;
  };

  const [allCustomizations, setAllCustomizations] = useState<
    DeliveryCustomization[]
  >([]);

  useEffect(() => {
    const customizations = loaderData?.body?.map(
      // TODO: type below properly
      (customization: any) => {
        return {
          id: customization.id,
          title: customization.title,
          enabled: customization.enabled,
        };
      },
    );
    setAllCustomizations(customizations);
    setFnName("");
  }, [loaderData]);

  const registerCustomizationResponse = useMemo(() => {
    const error =
      actionData?.body?.deliveryCustomizationCreate?.userErrors[0]?.message;
    const success =
      actionData?.body?.deliveryCustomizationCreate?.id &&
      "Successfully created";
    return (
      <Text variant="bodyMd" as="h4" tone={error ? "critical" : "success"}>
        {error || success}
      </Text>
    );
  }, [actionData]);

  return (
    <Page>
      <ui-title-bar title="Add delivery customisations here" />
      <Layout>
        <UserPreferences>
          <Layout.Section>
            <FormLayout>
              <Card>
                <Text fontWeight="bold" variant="bodyLg" as="h2">
                  Currently created delivery customization functions
                </Text>
                <ResourceList
                  emptyState={
                    <>
                      <Text variant="bodyMd" as="h3">
                        No delivery customizations
                      </Text>
                    </>
                  }
                  resourceName={{
                    singular: "Delivery Customization",
                    plural: "Delivery Customizations",
                  }}
                  items={allCustomizations}
                  renderItem={(customization) => {
                    return (
                      <ResourceItem id={customization.id} onClick={() => {}}>
                        <Text variant="bodyMd" fontWeight="bold" as="h3">
                          {customization.title}
                        </Text>
                        <Text
                          as="p"
                          tone={customization.enabled ? "success" : "critical"}
                        >
                          {customization.enabled ? "enabled" : "disabled"}
                        </Text>
                      </ResourceItem>
                    );
                  }}
                />
              </Card>
              <Card>
                <BlockStack gap="400">
                  <BlockStack gap="100">
                    <Text variant="bodyMd" fontWeight="bold" as="h3">
                      Register a new delivery customization function below. Give
                      it a name and click the button below.
                    </Text>
                    <Text variant="bodyMd" as="h4">
                      There can be a maximum of 5 enabled functions. Contact the
                      engineering team to modify them.
                    </Text>
                  </BlockStack>
                  <TextField
                    label="Delivery customization name"
                    placeholder="Enter here"
                    autoComplete="off"
                    value={fnName}
                    onChange={updateFnName}
                  />
                  <ButtonGroup>
                    <Button
                      onClick={createNewDeliveryCustomization}
                      variant="primary"
                    >
                      Create new delivery customization
                    </Button>
                  </ButtonGroup>
                  {registerCustomizationResponse}
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
