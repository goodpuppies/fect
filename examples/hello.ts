import { Fect } from "@goodpuppies/fect";

interface User {
  login: string;
  name?: string;
}

const fetchUser = Fect.fn((name: string): Promise<User> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        login: name,
        name: name.toUpperCase(),
      });
    }, 1);
  });
});

const getDisplayName = Fect.fn((user: User) => user.name ?? user.login);

// getDisplayName expects a User, but gets the async Fect from fetchUser.
// It just works, no await, no unwrap, no flatMap.
const name = getDisplayName(fetchUser("denoland"));

// Unwrap once at the boundary.
console.log(await Fect.try(name));