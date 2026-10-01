import 'dotenv/config';
import { clerkClient } from '@clerk/nextjs/server';

async function test() {
  const client = await clerkClient();
  console.log(Object.keys(client));
  console.log(client.users ? "Has users" : "No users");
  
  const userList = await client.users.getUserList({ userId: ['user_3IaSs4htHqtKuT16lTFMuiv5JKH'] });
  console.log(userList.data[0]);
}

test().catch(console.error);
