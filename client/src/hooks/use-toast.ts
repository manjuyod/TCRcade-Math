import * as React from "react"

import type {
  ToastActionElement,
  ToastProps,
} from "@/components/ui/toast"

const TOAST_LIMIT = 5  // Increased limit to allow multiple notifications
const TOAST_REMOVE_DELAY = 3000



// Extended ToastProps to include dismissTimeout
export interface ExtendedToastProps extends ToastProps {
  dismisstimeout?: number; // Time in ms after which toast auto-dismisses
}

type ToasterToast = ExtendedToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
}

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

type ActionType = typeof actionTypes

type Action =
  | {
      type: ActionType["ADD_TOAST"]
      toast: ToasterToast
    }
  | {
      type: ActionType["UPDATE_TOAST"]
      toast: Partial<ToasterToast>
    }
  | {
      type: ActionType["DISMISS_TOAST"]
      toastId?: ToasterToast["id"]
    }
  | {
      type: ActionType["REMOVE_TOAST"]
      toastId?: ToasterToast["id"]
    }

interface State {
  toasts: ToasterToast[]
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) {
    return
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId)
    dispatch({
      type: "REMOVE_TOAST",
      toastId: toastId,
    })
  }, TOAST_REMOVE_DELAY)

  toastTimeouts.set(toastId, timeout)
}

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }

    case "DISMISS_TOAST": {
      const { toastId } = action

      // ! Side effects ! - This could be extracted into a dismissToast() action,
      // but I'll keep it here for simplicity
      if (toastId) {
        addToRemoveQueue(toastId)
      } else {
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id)
        })
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t
        ),
      }
    }
    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        }
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
  }
}

const listeners: Array<(state: State) => void> = []

let memoryState: State = { toasts: [] }

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

type Toast = Omit<ToasterToast, "id">

function toast({ ...props }: Toast) {
  // Generate a unique ID for this toast
  const id = genId()
  
  // If there's already a toast with this exact message, don't add a duplicate
  // This prevents double notifications on rapid repeated actions
  const existingToasts = memoryState.toasts;
  const existingTitleToastIndex = existingToasts.findIndex(
    t => t.title === props.title && t.description === props.description
  );
  
  // If we found an existing toast with the same content, just update it instead of adding a new one
  if (existingTitleToastIndex >= 0) {
    console.log(`Updating existing toast (#${existingToasts[existingTitleToastIndex].id}) rather than creating duplicate`);
    const existingToast = existingToasts[existingTitleToastIndex];
    
    // Update the existing toast with any new props and reset its auto-dismiss timer
    dispatch({
      type: "UPDATE_TOAST",
      toast: { 
        ...existingToast,
        ...props,
        id: existingToast.id,
        open: true,
      },
    });
    
    // Reset the auto-dismiss timer by clearing and setting a new one
    const existingId = existingToast.id;
    if (toastTimeouts.has(existingId)) {
      clearTimeout(toastTimeouts.get(existingId));
      toastTimeouts.delete(existingId);
    }
    
    // Auto-dismiss after the timeout (if not disabled)
    const dismissTimeout = props.dismisstimeout || 3000;
    if (dismissTimeout > 0) {
      setTimeout(() => {
        dispatch({ type: "DISMISS_TOAST", toastId: existingId })
      }, dismissTimeout);
    }
    
    // Return the existing toast controls
    return {
      id: existingId,
      dismiss: () => dispatch({ type: "DISMISS_TOAST", toastId: existingId }),
      update: (props: ToasterToast) => dispatch({
        type: "UPDATE_TOAST",
        toast: { ...props, id: existingId },
      })
    };
  }
  
  // If no existing toast, create a new one
  const update = (props: ToasterToast) =>
    dispatch({
      type: "UPDATE_TOAST",
      toast: { ...props, id },
    })
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id })

  // Auto-dismiss toast after a timeout
  const DEFAULT_DISMISS_TIMEOUT = 3000 // 3 seconds
  const dismissTimeout = props.dismisstimeout || DEFAULT_DISMISS_TIMEOUT
  
  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss()
      },
    },
  })
  
  // Auto-dismiss after the timeout (if not disabled)
  if (dismissTimeout > 0) {
    setTimeout(() => {
      dismiss()
    }, dismissTimeout)
  }

  return {
    id: id,
    dismiss,
    update,
  }
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [state])

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
  }
}

export { useToast, toast }
