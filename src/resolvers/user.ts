import {
  Resolver,
  Query,
  Ctx,
  Arg,
  Int,
  Mutation,
  InputType,
  Field,
  ObjectType,
} from "type-graphql";
import argon2 from "argon2";

import { User } from "../entities/user";
import { MyContext } from "../type";

@InputType()
class UsernamePassword {
  @Field(() => String)
  username: string;

  @Field(() => String)
  password: string;
}

@ObjectType()
class FieldError {
  @Field(() => String, { nullable: true })
  field?: string;

  @Field(() => String, { nullable: true })
  message?: string;
}

@ObjectType()
class UserResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];

  @Field(() => User, { nullable: true })
  user?: User;
}

@Resolver()
export class UserResolver {
  @Query(() => [User])
  users(@Ctx() { em }: MyContext): Promise<User[]> {
    return em.find(User, {});
  }

  @Query(() => UserResponse)
  async account(@Ctx() { em, req }: MyContext): Promise<UserResponse> {
    const userId = req.session.userId;
    console.log("req.session ===> ", req.session);
    if (!userId) {
      return {
        errors: [{ message: "User is not logged" }],
      };
    }
    const user = await em.findOne(User, { id: userId });
    if (!user) {
      return {
        errors: [{ message: "User is not exits" }],
      };
    }
    return { user };
  }

  @Query(() => User, { nullable: true })
  post(
    @Arg("id", () => Int) id: number,
    @Ctx() { em }: MyContext
  ): Promise<User | null> {
    return em.findOne(User, { id });
  }

  @Mutation(() => UserResponse)
  async registerUser(
    @Arg("option", () => UsernamePassword) option: UsernamePassword,
    @Ctx() { em }: MyContext
  ): Promise<UserResponse> {
    if (option.username.length < 3) {
      return {
        errors: [
          { field: "username", message: "Length must be greater than 2" },
        ],
      };
    }

    if (option.password.length < 6) {
      return {
        errors: [
          { field: "password", message: "Length must be greater than 6" },
        ],
      };
    }

    const passHashed = await argon2.hash(option.password);
    const user = em.create(User, {
      username: option.username,
      password: passHashed,
    });

    try {
      await em.persistAndFlush(user);
    } catch (error) {
      if (error.code === "23505") {
        return {
          errors: [
            {
              field: "username",
              message: "Username already taken!",
            },
          ],
        };
      }
      console.log("Error registerUser: ", error);
    }

    return { user };
  }

  @Mutation(() => UserResponse)
  async login(
    @Arg("option", () => UsernamePassword) option: UsernamePassword,
    @Ctx() { em, req }: MyContext
  ): Promise<UserResponse> {
    const user = await em.findOne(User, {
      username: option.username,
    });

    if (!user) {
      return { errors: [{ field: "username", message: "Not found Username" }] };
    }
    const validPassword = await argon2.verify(user.password, option.password);
    if (!validPassword) {
      return {
        errors: [{ field: "", message: "Username or Password is incorrect" }],
      };
    }

    req.session.userId = user.id;

    return { user };
  }

  @Mutation(() => User, { nullable: true })
  async updateUsername(
    @Arg("id", () => Int) id: number,
    @Arg("username", () => String, { nullable: true }) username: string,
    @Ctx() { em }: MyContext
  ): Promise<User | null> {
    const user = await em.findOne(User, { id });
    if (!user) {
      return null;
    }
    if (username) {
      user.username = username;
      await em.persistAndFlush(user);
    }
    return user;
  }

  @Mutation(() => Boolean, { nullable: true })
  async deleteUser(
    @Arg("id", () => Int) id: number,
    @Ctx() { em }: MyContext
  ): Promise<boolean> {
    const user = await em.findOne(User, { id });
    if (!user) {
      return false;
    }
    await em.nativeDelete(User, { id });
    return true;
  }
}
