const NUMBEROFSECTIONS = 9;
const NUMBEROFINDICES = ARTWORK.length;
const FINALINDEX = NUMBEROFINDICES - 1;
const FIRSTINDEX = 0
var startAt = FIRSTINDEX;

function setImage(index, source)
{
    let strID = "image" + index;
    document.getElementById(strID).src = "images/" + source + ".png";
}
function setStoreLink(index, source)
{
    let strID = "storelink" + index;
    document.getElementById(strID).href = source;
}
function setName(index, artName)
{
    let strID = "name" + index;
    document.getElementById(strID).innerHTML = artName;
}
function setAction(index, actionText)
{
    let strID = "action" + index;
    document.getElementById(strID).innerHTML = actionText;
}
function setSection(index, entry)
{
    setImage(index, ARTWORK[entry].Image);
    setStoreLink(index, ARTWORK[entry].Link);
    setName(index, ARTWORK[entry].Name);
    setAction(index, ARTWORK[entry].Action);
}
function initializeImages()
{
    let i=0;
    for (i = 0; i < NUMBEROFSECTIONS; i++)
    {        
        setSection(i,startAt + i);
    }
}
function backButton()
{
    startAt -= NUMBEROFSECTIONS;
    if (startAt < FIRSTINDEX)
    {
        startAt = NUMBEROFINDICES + startAt;
    }
    let i;
    for (i = 0; i < NUMBEROFSECTIONS; i++)
    {
        let currentIndex = startAt + i;
        if (currentIndex < NUMBEROFINDICES)
        {
            setSection(i, currentIndex);
        }
        if (currentIndex >= NUMBEROFINDICES)
        {
            currentIndex = currentIndex - NUMBEROFINDICES;
            setSection(i, currentIndex);
        }
    }
}
function forwardButton()
{
    startAt += NUMBEROFSECTIONS;
    if (startAt > FINALINDEX)
    {
        startAt = startAt - NUMBEROFINDICES;
    }
    let i;
    for (i = 0; i < NUMBEROFSECTIONS; i++)
    {
        let currentIndex = startAt + i;
        if (currentIndex < NUMBEROFINDICES)
        {
            setSection(i, currentIndex);
        }
        if (currentIndex >= NUMBEROFINDICES)
        {
            currentIndex = currentIndex - NUMBEROFINDICES;
            setSection(i, currentIndex);
        }
    }
}
initializeImages();