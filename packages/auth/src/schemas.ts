import { z } from "zod";

export const EmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid email address."));

export const PasswordSchema = z
  .string()
  .min(12, "Use at least 12 characters.")
  .max(128, "Use no more than 128 characters.")
  .regex(/[A-Za-z]/, "Include at least one letter.")
  .regex(/[0-9]/, "Include at least one number.");

export const SignInInputSchema = z.strictObject({
  email: EmailSchema,
  password: z.string().min(1, "Enter your password.").max(128),
  next: z.string().optional(),
});

export const SignUpInputSchema = z
  .strictObject({
    displayName: z.string().trim().min(2, "Enter your name.").max(100),
    email: EmailSchema,
    password: PasswordSchema,
    passwordConfirmation: z.string(),
  })
  .refine((input) => input.password === input.passwordConfirmation, {
    message: "Passwords do not match.",
    path: ["passwordConfirmation"],
  });

export const ForgotPasswordInputSchema = z.strictObject({ email: EmailSchema });

export const UpdatePasswordInputSchema = z
  .strictObject({
    password: PasswordSchema,
    passwordConfirmation: z.string(),
  })
  .refine((input) => input.password === input.passwordConfirmation, {
    message: "Passwords do not match.",
    path: ["passwordConfirmation"],
  });

export const UpdateProfileInputSchema = z.strictObject({
  displayName: z.string().trim().min(2, "Enter your name.").max(100),
  locale: z.enum(["en-PH", "fil-PH"]),
  timezone: z.literal("Asia/Manila"),
});

// Provider contracts are intentionally present before provider UI is enabled.
export const OAuthProviderSchema = z.enum(["google", "facebook"]);
export type OAuthProvider = z.infer<typeof OAuthProviderSchema>;

export const PhoneOtpInputSchema = z.strictObject({
  phone: z.string().regex(/^\+[1-9]\d{7,14}$/, "Use E.164 format, for example +639171234567."),
});
