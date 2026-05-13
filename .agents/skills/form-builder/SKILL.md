---
name: form-builder
description: Generate form components with validation schemas and handlers
---
# Form Builder

Generate form components with validation, error handling, and submission logic for React, Vue, and other frameworks.

## Form Architecture

```
┌─────────────────────────────────────────────┐
│                    Form                       │
├─────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐           │
│  │   State     │  │ Validation  │           │
│  │ Management  │  │   Schema    │           │
│  └──────┬──────┘  └──────┬──────┘           │
│         │                │                  │
│         └────────┬───────┘                  │
│                  ▼                          │
│  ┌───────────────────────────┐              │
│  │      Field Components      │             │
│  │  Input | Select | Checkbox │             │
│  └───────────────────────────┘              │
│                  │                          │
│                  ▼                          │
│  ┌───────────────────────────┐              │
│  │     Submit & Error         │             │
│  │       Handling             │             │
│  └───────────────────────────┘              │
└─────────────────────────────────────────────┘
```

## React Hook Form + Zod

### Installation
```bash
npm install react-hook-form zod @hookform/resolvers
```

### Validation Schemas

```typescript
import { z } from 'zod'

export const userSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[a-z]/, 'Password must contain a lowercase letter')
    .regex(/[0-9]/, 'Password must contain a number'),
  confirmPassword: z.string(),
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: 'You must accept the terms and conditions',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

export const addressSchema = z.object({
  street: z.string().min(1, 'Street is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(2, 'State is required'),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code'),
  country: z.string().min(2, 'Country is required'),
})

export const paymentSchema = z.object({
  cardNumber: z
    .string()
    .regex(/^\d{16}$/, 'Invalid card number')
    .transform((val) => val.replace(/(\d{4})(?=\d)/g, '$1 ')),
  expiryDate: z
    .string()
    .regex(/^(0[1-9]|1[0-2])\/\d{2}$/, 'Invalid expiry date (MM/YY)'),
  cvv: z.string().regex(/^\d{3,4}$/, 'Invalid CVV'),
  cardholderName: z.string().min(2, 'Cardholder name is required'),
})

export const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email'),
  phone: z.string().regex(/^\+?[\d\s-]{10,}$/, 'Invalid phone number').optional().or(z.literal('')),
  bio: z.string().max(500, 'Bio must be 500 characters or less').optional(),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
  birthDate: z.coerce.date({
    required_error: 'Birth date is required',
    invalid_type_error: 'Invalid date',
  }).refine((date) => date < new Date(), 'Birth date must be in the past'),
})

export type UserFormData = z.infer<typeof userSchema>
export type AddressFormData = z.infer<typeof addressSchema>
export type PaymentFormData = z.infer<typeof paymentSchema>
export type ProfileFormData = z.infer<typeof profileSchema>
```

### Form Component

```tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { userSchema, type UserFormData } from './schemas'

interface UserFormProps {
  defaultValues?: Partial<UserFormData>
  onSubmit: (data: UserFormData) => Promise<void>
  isEditing?: boolean
}

export function UserForm({ defaultValues, onSubmit, isEditing = false }: UserFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, touchedFields },
    watch,
    setValue,
    reset,
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false,
      ...defaultValues,
    },
    mode: 'onBlur',
  })

  const password = watch('password')

  const handleFormSubmit = async (data: UserFormData) => {
    try {
      await onSubmit(data)
      reset()
    } catch (error) {
      console.error('Form submission error:', error)
    }
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6" noValidate>
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          Full Name
        </label>
        <input
          {...register('name')}
          type="text"
          id="name"
          autoComplete="name"
          className={`
            w-full px-3 py-2 border rounded-lg
            focus:outline-none focus:ring-2 focus:ring-blue-500
            ${errors.name ? 'border-red-500' : 'border-gray-300'}
          `}
          aria-invalid={errors.name ? 'true' : 'false'}
          aria-describedby={errors.name ? 'name-error' : undefined}
        />
        {errors.name && (
          <p id="name-error" className="mt-1 text-sm text-red-600" role="alert">
            {errors.name.message}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          Email Address
        </label>
        <input
          {...register('email')}
          type="email"
          id="email"
          autoComplete="email"
          className={`
            w-full px-3 py-2 border rounded-lg
            focus:outline-none focus:ring-2 focus:ring-blue-500
            ${errors.email ? 'border-red-500' : 'border-gray-300'}
          `}
          aria-invalid={errors.email ? 'true' : 'false'}
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-600" role="alert">
            {errors.email.message}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
          Password
        </label>
        <input
          {...register('password')}
          type="password"
          id="password"
          autoComplete="new-password"
          className={`
            w-full px-3 py-2 border rounded-lg
            focus:outline-none focus:ring-2 focus:ring-blue-500
            ${errors.password ? 'border-red-500' : 'border-gray-300'}
          `}
          aria-invalid={errors.password ? 'true' : 'false'}
        />
        {errors.password && (
          <p className="mt-1 text-sm text-red-600" role="alert">
            {errors.password.message}
          </p>
        )}
        {touchedFields.password && !errors.password && (
          <p className="mt-1 text-sm text-green-600">Password looks good!</p>
        )}
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
          Confirm Password
        </label>
        <input
          {...register('confirmPassword')}
          type="password"
          id="confirmPassword"
          autoComplete="new-password"
          className={`
            w-full px-3 py-2 border rounded-lg
            focus:outline-none focus:ring-2 focus:ring-blue-500
            ${errors.confirmPassword ? 'border-red-500' : 'border-gray-300'}
          `}
        />
        {errors.confirmPassword && (
          <p className="mt-1 text-sm text-red-600" role="alert">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>

      <div className="flex items-start">
        <input
          {...register('acceptTerms')}
          type="checkbox"
          id="acceptTerms"
          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-1"
        />
        <label htmlFor="acceptTerms" className="ml-2 text-sm text-gray-700">
          I accept the <a href="/terms" className="text-blue-600 hover:underline">Terms of Service</a> and{' '}
          <a href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</a>
        </label>
      </div>
      {errors.acceptTerms && (
        <p className="text-sm text-red-600" role="alert">
          {errors.acceptTerms.message}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className={`
          w-full py-2 px-4 rounded-lg font-medium text-white
          bg-blue-600 hover:bg-blue-700
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors
        `}
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Submitting...
          </span>
        ) : isEditing ? (
          'Update'
        ) : (
          'Create Account'
        )}
      </button>
    </form>
  )
}
```

### Reusable Form Field Components

```tsx
import { type UseFormRegister, type FieldError, type Path, type FieldValues } from 'react-hook-form'

interface TextFieldProps<T extends FieldValues> {
  register: UseFormRegister<T>
  name: Path<T>
  label: string
  type?: 'text' | 'email' | 'password' | 'tel' | 'url'
  placeholder?: string
  error?: FieldError
  required?: boolean
  autoComplete?: string
}

export function TextField<T extends FieldValues>({
  register,
  name,
  label,
  type = 'text',
  placeholder,
  error,
  required = false,
  autoComplete,
}: TextFieldProps<T>) {
  const id = name.toString()

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        {...register(name)}
        type={type}
        id={id}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={`
          w-full px-3 py-2 border rounded-lg
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
          disabled:bg-gray-50 disabled:text-gray-500
          ${error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 hover:border-gray-400'}
        `}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error && (
        <p id={`${id}-error`} className="text-sm text-red-600" role="alert">
          {error.message}
        </p>
      )}
    </div>
  )
}

interface SelectFieldProps<T extends FieldValues> {
  register: UseFormRegister<T>
  name: Path<T>
  label: string
  options: { value: string; label: string }[]
  error?: FieldError
  placeholder?: string
  required?: boolean
}

export function SelectField<T extends FieldValues>({
  register,
  name,
  label,
  options,
  error,
  placeholder,
  required = false,
}: SelectFieldProps<T>) {
  const id = name.toString()

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <select
        {...register(name)}
        id={id}
        className={`
          w-full px-3 py-2 border rounded-lg
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
          ${error ? 'border-red-500' : 'border-gray-300 hover:border-gray-400'}
        `}
        aria-invalid={error ? 'true' : 'false'}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error.message}
        </p>
      )}
    </div>
  )
}

interface CheckboxFieldProps<T extends FieldValues> {
  register: UseFormRegister<T>
  name: Path<T>
  label: string
  error?: FieldError
}

export function CheckboxField<T extends FieldValues>({
  register,
  name,
  label,
  error,
}: CheckboxFieldProps<T>) {
  const id = name.toString()

  return (
    <div>
      <div className="flex items-center">
        <input
          {...register(name)}
          type="checkbox"
          id={id}
          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <label htmlFor={id} className="ml-2 text-sm text-gray-700">
          {label}
        </label>
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600" role="alert">
          {error.message}
        </p>
      )}
    </div>
  )
}

interface TextareaFieldProps<T extends FieldValues> {
  register: UseFormRegister<T>
  name: Path<T>
  label: string
  placeholder?: string
  error?: FieldError
  rows?: number
  maxLength?: number
}

export function TextareaField<T extends FieldValues>({
  register,
  name,
  label,
  placeholder,
  error,
  rows = 4,
  maxLength,
}: TextareaFieldProps<T>) {
  const id = name.toString()
  const { onChange, ...rest } = register(name)

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <textarea
        {...rest}
        id={id}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        onChange={onChange}
        className={`
          w-full px-3 py-2 border rounded-lg resize-none
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
          ${error ? 'border-red-500' : 'border-gray-300 hover:border-gray-400'}
        `}
        aria-invalid={error ? 'true' : 'false'}
      />
      <div className="flex justify-between">
        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error.message}
          </p>
        )}
        {maxLength && (
          <p className="text-sm text-gray-500 ml-auto">
            {0}/{maxLength}
          </p>
        )}
      </div>
    </div>
  )
}
```

### Multi-Step Form

```tsx
import { useState } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const step1Schema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email'),
})

const step2Schema = z.object({
  address: z.string().min(1, 'Required'),
  city: z.string().min(1, 'Required'),
  country: z.string().min(1, 'Required'),
})

const step3Schema = z.object({
  preferences: z.array(z.string()).min(1, 'Select at least one'),
  newsletter: z.boolean(),
})

const fullSchema = step1Schema.and(step2Schema).and(step3Schema)

type FormData = z.infer<typeof fullSchema>

const steps = [
  { id: 1, title: 'Personal Info', schema: step1Schema },
  { id: 2, title: 'Address', schema: step2Schema },
  { id: 3, title: 'Preferences', schema: step3Schema },
]

interface MultiStepFormProps {
  onSubmit: (data: FormData) => Promise<void>
}

export function MultiStepForm({ onSubmit }: MultiStepFormProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])

  const methods = useForm<FormData>({
    resolver: zodResolver(fullSchema),
    mode: 'onBlur',
  })

  const { trigger, handleSubmit, formState: { isSubmitting } } = methods

  const handleNext = async () => {
    const stepFields = {
      0: ['firstName', 'lastName', 'email'],
      1: ['address', 'city', 'country'],
      2: ['preferences', 'newsletter'],
    }

    const isValid = await trigger(stepFields[currentStep] as any)
    if (isValid) {
      setCompletedSteps([...completedSteps, currentStep])
      setCurrentStep((prev) => prev + 1)
    }
  }

  const handleBack = () => {
    setCurrentStep((prev) => prev - 1)
  }

  const isLastStep = currentStep === steps.length - 1

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} className="max-w-xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                    ${index === currentStep
                      ? 'bg-blue-600 text-white'
                      : completedSteps.includes(index)
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }
                  `}
                >
                  {completedSteps.includes(index) ? '✓' : step.id}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`w-full h-1 mx-2 ${
                      completedSteps.includes(index) ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <p className="mt-2 text-center text-sm text-gray-600">
            Step {currentStep + 1}: {steps[currentStep].title}
          </p>
        </div>

        <div className="space-y-6">
          {currentStep === 0 && (
            <>
              <TextField register={methods.register} name="firstName" label="First Name" error={methods.formState.errors.firstName} required />
              <TextField register={methods.register} name="lastName" label="Last Name" error={methods.formState.errors.lastName} required />
              <TextField register={methods.register} name="email" label="Email" type="email" error={methods.formState.errors.email} required />
            </>
          )}

          {currentStep === 1 && (
            <>
              <TextField register={methods.register} name="address" label="Address" error={methods.formState.errors.address} required />
              <TextField register={methods.register} name="city" label="City" error={methods.formState.errors.city} required />
              <SelectField
                register={methods.register}
                name="country"
                label="Country"
                error={methods.formState.errors.country}
                options={[
                  { value: 'us', label: 'United States' },
                  { value: 'uk', label: 'United Kingdom' },
                  { value: 'ca', label: 'Canada' },
                ]}
                required
              />
            </>
          )}

          {currentStep === 2 && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferences
                </label>
                <div className="space-y-2">
                  {['Email updates', 'SMS notifications', 'Weekly digest'].map((pref) => (
                    <CheckboxField
                      key={pref}
                      register={methods.register}
                      name="preferences"
                      label={pref}
                    />
                  ))}
                </div>
              </div>
              <CheckboxField
                register={methods.register}
                name="newsletter"
                label="Subscribe to newsletter"
              />
            </>
          )}
        </div>

        <div className="mt-8 flex justify-between">
          <button
            type="button"
            onClick={handleBack}
            disabled={currentStep === 0}
            className="px-4 py-2 text-gray-700 hover:text-gray-900 disabled:opacity-50"
          >
            Back
          </button>

          {isLastStep ? (
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Next
            </button>
          )}
        </div>
      </form>
    </FormProvider>
  )
}
```

### Form Patterns

| Pattern | Use Case | Implementation |
|---------|----------|----------------|
| **Real-time validation** | Immediate feedback | `mode: 'onChange'` |
| **Blur validation** | After field exit | `mode: 'onBlur'` |
| **Submit validation** | On form submit | `mode: 'onSubmit'` |
| **Dependent fields** | Password confirm | `.refine()` in Zod |
| **Async validation** | Check uniqueness | Custom resolver |
| **Conditional fields** | Show/hide based on value | `watch()` + conditional |

## Best Practices

### Do's
- Use proper input types (email, tel, etc.)
- Add autocomplete attributes
- Show inline validation errors
- Disable submit during submission
- Use accessible labels and ARIA
- Handle loading and error states

### Don'ts
- Validate on every keystroke (performance)
- Clear form on validation error
- Use placeholder as label
- Forget keyboard navigation
- Skip server-side validation
- Ignore accessibility
