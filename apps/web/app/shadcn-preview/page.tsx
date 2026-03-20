import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Badge } from "@workspace/ui/components/badge"

export default function ShadcnPreviewPage() {
  return (
    <div className="p-8 space-y-8">
      <div className="space-y-4">
        <p className="text-sm text-gray-500">
          Raw shadcn/ui components from <code>@workspace/ui</code> with no extra Grail layout.
        </p>

        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500">Buttons</p>
          <div className="flex flex-wrap items-center gap-3">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button disabled>Disabled</Button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500">Inputs</p>
          <div className="grid gap-4 md:grid-cols-2">
            <Input placeholder="Skin name" />
            <Input type="number" placeholder="0.0000" />
            <Input placeholder="With prefix via parent wrapper" className="md:col-span-2" />
            <Input disabled value="Disabled" className="md:col-span-2" />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500">Badges</p>
          <div className="flex flex-wrap gap-2">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="destructive">Destructive</Badge>
          </div>
        </div>
      </div>
    </div>
  )
}

