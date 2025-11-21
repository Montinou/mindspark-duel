import { StackServerApp } from "@stackframe/stack";

export const stackServerApp = new StackServerApp({
  tokenStore: "nextjs-cookie",
});

export async function validateStackToken(accessToken: string) {
  const url = 'https://api.stack-auth.com/api/v1/users/me';
  const headers = {
    'x-stack-access-type': 'server',
    'x-stack-project-id': process.env.NEXT_PUBLIC_STACK_PROJECT_ID!,
    'x-stack-secret-server-key': process.env.STACK_SECRET_SERVER_KEY!,
    'x-stack-access-token': accessToken,
  };

  const response = await fetch(url, { headers });
  if (response.status === 200) {
    return await response.json();
  } else {
    return null;
  }
}
