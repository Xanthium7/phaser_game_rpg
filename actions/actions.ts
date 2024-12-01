'user server'
import { useUser } from "@clerk/nextjs";

export const getCurrentUser = async () => {
    const user = useUser();
    console.log(user);
}