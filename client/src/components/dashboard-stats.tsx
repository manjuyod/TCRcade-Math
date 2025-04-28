
import { Card } from "./ui/card"
import { 
  LineChart, 
  Timer, 
  Medal,
  BookOpen 
} from "lucide-react"

export function DashboardStats({ 
  myScore,
  cohortScore,
  questionsAnswered,
  studyTime 
}: { 
  myScore: number,
  cohortScore: number,
  questionsAnswered: number,
  studyTime: string
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      <Card>
        <div className="flex items-center gap-4">
          <LineChart className="w-8 h-8 text-primary" />
          <div>
            <p className="text-sm text-muted-foreground">My Score</p>
            <h3 className="text-2xl font-bold">{myScore} / 1600</h3>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-4">
          <Medal className="w-8 h-8 text-primary" />
          <div>
            <p className="text-sm text-muted-foreground">Cohort Score</p>
            <h3 className="text-2xl font-bold">{cohortScore} / 1600</h3>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-4">
          <BookOpen className="w-8 h-8 text-primary" />
          <div>
            <p className="text-sm text-muted-foreground">Questions Practiced</p>
            <h3 className="text-2xl font-bold">{questionsAnswered}</h3>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-4">
          <Timer className="w-8 h-8 text-primary" />
          <div>
            <p className="text-sm text-muted-foreground">Study Time</p>
            <h3 className="text-2xl font-bold">{studyTime}</h3>
          </div>
        </div>
      </Card>
    </div>
  )
}
