var allArtwork = [];
var allSources = []
function populateImageList()
{
    let i;
    for (i=0; i < ARTWORK.length; i++)
    {
        allSources[i] = "images/" + ARTWORK[i].Image + ".png";
    }
}
function preloadImages()
{
    let i;
    for (i=0; i < allSources.length; i++)
    {
        allArtwork[i] = new Image();
        allArtwork[i].src = allSources[i];
    }
}
populateImageList()
preloadImages();