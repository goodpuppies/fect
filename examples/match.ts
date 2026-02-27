import { Fect } from "../mod.ts";

type UserType = "admin" | "user";

const login = Fect.fn((userType: UserType) => {
  return Fect.match(userType).with({
    admin: (type) => "Welcome, Administrator!",
    user: (type) => "Hello, User!",
  })
})
const msg = login("user")

console.log(msg)