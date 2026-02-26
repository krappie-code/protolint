export const EXAMPLE_PROTO = `syntax = "proto3";

package example.v1;

import "google/protobuf/timestamp.proto";

// A user in the system.
message User {
  string user_id = 1;
  string display_name = 2;
  string email = 3;
  google.protobuf.Timestamp created_at = 4;
  UserRole role = 5;
}

// Role of the user.
enum UserRole {
  USER_ROLE_UNSPECIFIED = 0;
  USER_ROLE_ADMIN = 1;
  USER_ROLE_MEMBER = 2;
  USER_ROLE_GUEST = 3;
}

// Service for managing users.
service UserService {
  // Creates a new user.
  rpc CreateUser(CreateUserRequest) returns (User);

  // Gets a user by ID.
  rpc GetUser(GetUserRequest) returns (User);
}

message CreateUserRequest {
  string display_name = 1;
  string email = 2;
}

message GetUserRequest {
  string user_id = 1;
}
`;
