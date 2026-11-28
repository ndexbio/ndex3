import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { SearchBox } from '@/components/SearchBox'

export const SearchCard = () => {
  return (
    <Card className="w-full p-2">
      <CardHeader>
        <CardTitle>NDEx Search</CardTitle>
        <CardDescription>Search for networks in NDEx</CardDescription>
      </CardHeader>
      <CardContent>
        <SearchBox />
      </CardContent>
    </Card>
  )
}
