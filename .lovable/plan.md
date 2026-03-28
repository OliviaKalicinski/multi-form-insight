

## Fix: Add missing `User` import in CadastroInfluenciadores.tsx

**Problem:** The `User` icon from lucide-react is used in the component but not imported, causing a build error.

**Change:** In `src/pages/CadastroInfluenciadores.tsx`, line 19, add `User` after `Users` in the lucide-react import.

**Before (line 19):**
```
  TrendingUp, Link2, Users, LinkIcon, Zap, CheckCircle2, AlertCircle,
```

**After:**
```
  TrendingUp, Link2, Users, User, LinkIcon, Zap, CheckCircle2, AlertCircle,
```

Single-line change, no other files affected.

