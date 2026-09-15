const RAW = `
the be to of and a in that have I it for not on with he as you do at this but his by from they we say her she or an will my one all would there their what so up out if about who get which go me when make can like time no just him know take people into year your good some could them see other than then now look only come its over think also back after use two how our work first well way even new want because any these give day most us is was are been has had were did does am
student students university essay research write writing written handwritten page pages assignment exercise lecturer course campus faculty department programme program
technology society entrepreneurship knowledge current issue issues general independent learning practice argument arguments evidence example examples introduction conclusion structure organization organisation
understand understanding topic relevance subject reasoning feedback rubric spelling language grammar punctuation
content analysis analyse analyze discuss discuss discuss describe explain evaluate compare contrast define
important important important however therefore moreover furthermore although because since while during
between among against without within through before after around under over
person people government country countries world community economy economic social political
education school college study studies student learning teaching teacher
information data system systems computer internet digital online media
problem problems solution solutions result results cause causes effect effects
idea ideas opinion opinions view views point points reason reasons
time times year years day days week weeks month months today yesterday tomorrow
work works working worked worker workers job jobs
make makes making made take takes taking took given give gives
think thought thinking know known knowledge
good better best bad worse worst more most less least very too also
can could should would may might must will shall
not no never none nothing neither
this that these those such
who whom whose which what where when why how
and but or nor for yet so
from with without into onto upon
about above across after against along among around before behind below beneath beside between beyond
during except inside outside toward towards until
one two three four five six seven eight nine ten hundred thousand
first second third last next previous
many much several few each every all some any
own same different similar other another
new old young high low long short large small great little
true false right wrong possible impossible necessary
public private local national international
development develop developed developing
create created creating creation
use used using useful
include including included
increase increase increased decrease decreased
level levels part parts area areas field fields
case cases type types kind kinds form forms
number numbers amount amounts
value values quality qualities
change changes changed changing
need needs needed needing
help helps helped helping
show shows showed shown
find found finding
become became becoming
leave left leaving
keep kept keeping
call called calling
try tried trying
ask asked asking
feel felt feeling
seem seemed seeming
leave remain remains remaining
begin began begun beginning
end ended ending
open opened opening
close closed closing
read reading reader readers
write writer writers written
speak speaking speech
listen listening
learn learning learned
teach taught teaching
mean means meaning meant
believe believed belief
consider considered considering
understand understood
remember remembered
follow followed following
allow allowed allowing
require required requiring
provide provided providing
support supported supporting
receive received receiving
produce produced producing
offer offered offering
expect expected expecting
appear appeared appearing
continue continued continuing
build built building
lead led leading
lose lost losing
pay paid paying
play played playing
run ran running
move moved moving
live lived living
happen happened happening
bring brought bringing
write research paper papers citation citations source sources reference references
bibliography appendix conclusion conclusions
paragraph paragraphs sentence sentences word words vocabulary
handwriting handwritten camera photo photograph scan scanned upload submit submission deadline
page pages original image images
french english bilingual campus branch faculties
control assessment formative practice
`;

export const EN_WORDS = new Set(
  RAW.split(/\s+/).map((w) => w.toLowerCase()).filter(Boolean),
);
