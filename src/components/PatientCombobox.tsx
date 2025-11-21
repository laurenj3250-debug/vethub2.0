"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface PatientOption {
  id: string
  name: string
  species?: string
  breed?: string
  age?: string
  sex?: string
  weight?: string
}

interface PatientComboboxProps {
  patients: PatientOption[]
  value?: string
  onValueChange: (value: string) => void
  onPatientSelect?: (patient: PatientOption) => void
  placeholder?: string
  emptyText?: string
  disabled?: boolean
}

export function PatientCombobox({
  patients,
  value,
  onValueChange,
  onPatientSelect,
  placeholder = "Select patient...",
  emptyText = "No patients found.",
  disabled = false,
}: PatientComboboxProps) {
  const [open, setOpen] = React.useState(false)

  const selectedPatient = patients.find((patient) => patient.id === value)

  const handleSelect = (currentValue: string) => {
    const newValue = currentValue === value ? "" : currentValue
    onValueChange(newValue)

    if (newValue && onPatientSelect) {
      const patient = patients.find((p) => p.id === newValue)
      if (patient) {
        onPatientSelect(patient)
      }
    }

    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {selectedPatient ? (
            <span className="truncate">
              {selectedPatient.name}
              {selectedPatient.age && selectedPatient.species && (
                <span className="text-xs text-gray-500 ml-2">
                  ({selectedPatient.age} {selectedPatient.sex || ''} {selectedPatient.breed || selectedPatient.species})
                </span>
              )}
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0">
        <Command>
          <CommandInput placeholder="Search patients..." />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {patients.map((patient) => (
                <CommandItem
                  key={patient.id}
                  value={`${patient.name} ${patient.breed || ''} ${patient.species || ''}`.toLowerCase()}
                  onSelect={() => handleSelect(patient.id)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === patient.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">{patient.name}</span>
                    {(patient.species || patient.breed || patient.age) && (
                      <span className="text-xs text-gray-500">
                        {patient.age && `${patient.age} `}
                        {patient.sex && `${patient.sex} `}
                        {patient.breed && `${patient.breed} `}
                        {!patient.breed && patient.species && `${patient.species} `}
                        {patient.weight && `• ${patient.weight}`}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
