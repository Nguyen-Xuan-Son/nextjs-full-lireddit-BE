import { Entity, Property, PrimaryKey } from "@mikro-orm/core";
import { Field, Int, ObjectType } from "type-graphql";

@ObjectType()
@Entity()
export class User {
  @Field(() => Int)
  @PrimaryKey()
  id!: number;

  @Field(() => String)
  @Property({ type: "date" })
  createAt = new Date();

  @Field(() => String)
  @Property({ type: "date", onUpdate: () => new Date() })
  updateAt = new Date();

  @Field(() => String)
  @Property({ type: "text", unique: true })
  username!: string;

  @Field(() => String)
  @Property({ type: "text" })
  password!: string;
}
